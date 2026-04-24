require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { runInvestigation, resumeInvestigation, resumeInvestigationWithText, answerFollowUp } = require('./agent');
const memory = require('./memory');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

const upload = multer({ storage: multer.memoryStorage() });
const sessionWriteQueues = new Map();

function enqueueSessionWrite(sessionId, task) {
  const previous = sessionWriteQueues.get(sessionId) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  sessionWriteQueues.set(sessionId, next);
  next.finally(() => {
    if (sessionWriteQueues.get(sessionId) === next) {
      sessionWriteQueues.delete(sessionId);
    }
  });
  return next;
}

function summarizeSessionPatch(event, data) {
  switch (event) {
    case 'phase':
      return { currentPhase: data.phase || null };
    case 'phase_update':
      return {
        status: 'streaming',
        currentPhase: data.phase || null,
        phaseStatus: data.status || '',
        phaseProgress: typeof data.progress === 'number' ? data.progress : null,
      };
    case 'budget':
      return { budget: data || null };
    case 'camera_guidance':
      return { modelGuidance: data || null };
    case 'evidence_request':
      return {
        status: 'awaiting_evidence',
        evidenceRequest: data || null,
        followUpQuestion: null,
      };
    case 'follow_up_question':
      return {
        status: 'awaiting_clarification',
        followUpQuestion: data || null,
        evidenceRequest: null,
      };
    case 'annotation':
      return {};
    case 'brief':
      return {
        status: 'complete',
        brief: data || null,
        evidenceRequest: null,
        followUpQuestion: null,
        phaseProgress: 1,
      };
    case 'done':
      return data?.error
        ? { status: 'error', error: data.error }
        : {};
    default:
      return {};
  }
}

async function trackSessionEvent(sessionId, event, data) {
  if (!sessionId) return;
  return enqueueSessionWrite(sessionId, async () => {
    const session = await memory.loadInvestigationSession(sessionId);
    const nextAnnotations =
      event === 'annotation'
        ? [...(Array.isArray(session?.annotations) ? session.annotations : []), data]
        : undefined;

    await memory.appendInvestigationEvent(sessionId, event, data);
    await memory.saveInvestigationSession(sessionId, {
      ...(typeof nextAnnotations !== 'undefined' ? { annotations: nextAnnotations } : {}),
      ...summarizeSessionPatch(event, data),
    });
  });
}

// Helper to handle SSE connection
function createSseEmitter(res, { onSend } = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  let closed = false;

  return {
    send: (event, data) => {
      if (closed) return;
      if (typeof onSend === 'function') {
        Promise.resolve(onSend(event, data)).catch((error) => {
          console.error('Failed to persist SSE event:', error);
        });
      }
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    end: () => {
      if (closed) return;
      closed = true;
      res.end();
    },
  };
}

app.post('/api/investigate', upload.single('image'), async (req, res) => {
  const { symptomText, vehicleId } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;
  const imageMimeType = req.file ? req.file.mimetype : null;
  
  // Generate a random session ID
  const sessionId = Math.random().toString(36).substring(7);

  if (!vehicleId || !symptomText) {
    const sseEmitter = createSseEmitter(res);
    sseEmitter.send('done', { error: 'vehicleId and symptomText are required.' });
    sseEmitter.end();
    return;
  }

  await memory.saveInvestigationSession(sessionId, {
    sessionId,
    vehicleId,
    status: 'streaming',
    currentPhase: 'INTAKE',
    phaseStatus: 'Preparing the investigation.',
    phaseProgress: 0.04,
    modelGuidance: null,
    evidenceRequest: null,
    followUpQuestion: null,
    brief: null,
    annotations: [],
    budget: { used: 0, total: 60000, remaining: 60000 },
    error: null,
  });

  const sseEmitter = createSseEmitter(res, {
    onSend: (event, data) => trackSessionEvent(sessionId, event, data),
  });
  
  // Send the session ID so the client can use it for submitting evidence
  sseEmitter.send('session_start', { sessionId });

  try {
    await runInvestigation(vehicleId, sessionId, symptomText, imageBuffer, imageMimeType, sseEmitter);
  } catch (err) {
    sseEmitter.send('done', { error: err.message });
    sseEmitter.end();
  }
});

app.post('/api/submit-evidence', upload.single('image'), async (req, res) => {
  const { vehicleId, sessionId } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;
  const imageMimeType = req.file ? req.file.mimetype : null;

  if (!sessionId || !imageBuffer) {
    const sseEmitter = createSseEmitter(res);
    sseEmitter.send('done', { error: 'sessionId and image are required.' });
    sseEmitter.end();
    return;
  }

  const existingSession = await memory.loadInvestigationSession(sessionId);
  if (!existingSession) {
    const sseEmitter = createSseEmitter(res);
    sseEmitter.send('done', { error: 'Session not found.' });
    sseEmitter.end();
    return;
  }

  await memory.saveInvestigationSession(sessionId, {
    vehicleId: vehicleId || existingSession.vehicleId || null,
    status: 'streaming',
    phaseStatus: 'Reviewing the requested evidence.',
    phaseProgress: 0.52,
    evidenceRequest: null,
    followUpQuestion: null,
    error: null,
  });

  const sseEmitter = createSseEmitter(res, {
    onSend: (event, data) => trackSessionEvent(sessionId, event, data),
  });

  try {
    await resumeInvestigation(sessionId, imageBuffer, imageMimeType, sseEmitter);
  } catch (err) {
    sseEmitter.send('done', { error: err.message });
    sseEmitter.end();
  }
});

app.post('/api/submit-clarification', async (req, res) => {
  const { sessionId, answerText } = req.body;

  if (!sessionId || !answerText) {
    const sseEmitter = createSseEmitter(res);
    sseEmitter.send('done', { error: 'sessionId and answerText are required.' });
    sseEmitter.end();
    return;
  }

  const existingSession = await memory.loadInvestigationSession(sessionId);
  if (!existingSession) {
    const sseEmitter = createSseEmitter(res);
    sseEmitter.send('done', { error: 'Session not found.' });
    sseEmitter.end();
    return;
  }

  await memory.saveInvestigationSession(sessionId, {
    vehicleId: existingSession.vehicleId || null,
    status: 'streaming',
    phaseStatus: 'Reviewing the clarification.',
    phaseProgress: 0.32,
    followUpQuestion: null,
    evidenceRequest: null,
    error: null,
  });

  const sseEmitter = createSseEmitter(res, {
    onSend: (event, data) => trackSessionEvent(sessionId, event, data),
  });

  try {
    await resumeInvestigationWithText(sessionId, answerText, sseEmitter);
  } catch (err) {
    sseEmitter.send('done', { error: err.message });
    sseEmitter.end();
  }
});

app.post('/api/chat-followup', async (req, res) => {
  const { vehicleId, promptText, chatMessages, brief } = req.body;

  if (!vehicleId || !promptText || typeof promptText !== 'string') {
    return res.status(400).json({ error: 'vehicleId and promptText are required.' });
  }

  try {
    const reply = await answerFollowUp(vehicleId, promptText, Array.isArray(chatMessages) ? chatMessages : [], brief || null);
    return res.json({ reply });
  } catch (error) {
    console.error('Follow-up chat error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/case-notes/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const history = await memory.loadCaseFile(vehicleId);
  res.json(history);
});

app.get('/api/investigation-state/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const since = Number.parseInt(req.query.since, 10);
  const session = await memory.findLatestVehicleSession(vehicleId);

  if (!session) {
    return res.json({ session: null, events: [], cursor: 0 });
  }

  const events = Number.isFinite(since)
    ? (Array.isArray(session.events) ? session.events.filter((event) => event.index >= since) : [])
    : [];

  return res.json({
    session: {
      sessionId: session.sessionId,
      vehicleId: session.vehicleId,
      status: session.status || 'idle',
      currentPhase: session.currentPhase || null,
      phaseStatus: session.phaseStatus || '',
      phaseProgress: typeof session.phaseProgress === 'number' ? session.phaseProgress : null,
      modelGuidance: session.modelGuidance || null,
      evidenceRequest: session.evidenceRequest || null,
      followUpQuestion: session.followUpQuestion || null,
      brief: session.brief || null,
      annotations: Array.isArray(session.annotations) ? session.annotations : [],
      budget: session.budget || null,
      error: session.error || null,
      updatedAt: session.updatedAt || null,
      eventCount: typeof session.eventCount === 'number' ? session.eventCount : 0,
    },
    events,
    cursor: typeof session.eventCount === 'number' ? session.eventCount : 0,
  });
});

app.delete('/api/case-notes/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  try {
    await memory.clearCaseFile(vehicleId);
    await memory.clearVehicleInvestigationSessions(vehicleId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/investigation-state/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  try {
    await memory.clearVehicleInvestigationSessions(vehicleId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/garages', (req, res) => {
  res.json([
    {
      "id": "g1",
      "name": "Al Futtaim Auto Centre",
      "distance_km": 1.2,
      "rating": 4.8,
      "slots": ["Today 4:30 PM", "Tomorrow 9:00 AM", "Tomorrow 2:00 PM"]
    },
    {
      "id": "g2", 
      "name": "Emirates Motor Company",
      "distance_km": 2.7,
      "rating": 4.6,
      "slots": ["Tomorrow 11:00 AM", "Thu 9:00 AM"]
    },
    {
      "id": "g3",
      "name": "Quick Lube & Service",
      "distance_km": 0.8,
      "rating": 4.3,
      "slots": ["Today 5:00 PM", "Tomorrow 8:30 AM"]
    }
  ]);
});

const PORT = process.env.PORT || 3001;
(async () => {
  await app.listen(PORT, '0.0.0.0');
  console.log(`Backend server running on 0.0.0.0:${PORT}`);
})();
