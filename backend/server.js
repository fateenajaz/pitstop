require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { runInvestigation, resumeInvestigation } = require('./agent');
const memory = require('./memory');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Helper to handle SSE connection
function createSseEmitter(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  let closed = false;

  return {
    send: (event, data) => {
      if (closed) return;
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

  const sseEmitter = createSseEmitter(res);

  if (!vehicleId || !symptomText) {
    sseEmitter.send('done', { error: 'vehicleId and symptomText are required.' });
    sseEmitter.end();
    return;
  }
  
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

  const sseEmitter = createSseEmitter(res);

  if (!sessionId || !imageBuffer) {
    sseEmitter.send('done', { error: 'sessionId and image are required.' });
    sseEmitter.end();
    return;
  }

  try {
    await resumeInvestigation(sessionId, imageBuffer, imageMimeType, sseEmitter);
  } catch (err) {
    sseEmitter.send('done', { error: err.message });
    sseEmitter.end();
  }
});

app.get('/api/case-notes/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const history = await memory.loadCaseFile(vehicleId);
  res.json(history);
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
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
