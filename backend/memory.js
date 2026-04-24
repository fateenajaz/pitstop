const fs = require('fs').promises;
const path = require('path');

const CASE_DIR = path.join(__dirname, 'case-files');
const SESSION_DIR = path.join(__dirname, 'session-files');

async function readJsonFile(filePath, fallback) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function loadCaseFile(vehicleId) {
  const filePath = path.join(CASE_DIR, `${vehicleId}.json`);
  return readJsonFile(filePath, { vehicleId, notes: [], investigations: [] });
}

async function appendCaseNote(vehicleId, note) {
  const caseFile = await loadCaseFile(vehicleId);
  caseFile.notes.push({ timestamp: new Date().toISOString(), note });
  const filePath = path.join(CASE_DIR, `${vehicleId}.json`);
  await writeJsonFile(filePath, caseFile);
}

async function clearCaseFile(vehicleId) {
  const filePath = path.join(CASE_DIR, `${vehicleId}.json`);
  try {
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist, that's fine
  }
}

function getSessionFilePath(sessionId) {
  return path.join(SESSION_DIR, `${sessionId}.json`);
}

async function loadInvestigationSession(sessionId) {
  if (!sessionId) return null;
  return readJsonFile(getSessionFilePath(sessionId), null);
}

async function saveInvestigationSession(sessionId, patch) {
  if (!sessionId) return null;

  const current = (await loadInvestigationSession(sessionId)) || {
    sessionId,
    vehicleId: null,
    status: 'idle',
    currentPhase: null,
    phaseStatus: '',
    phaseProgress: null,
    modelGuidance: null,
    evidenceRequest: null,
    followUpQuestion: null,
    brief: null,
    annotations: [],
    budget: null,
    events: [],
    eventCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (!Array.isArray(next.events)) next.events = [];
  if (!Array.isArray(next.annotations)) next.annotations = [];
  if (typeof next.eventCount !== 'number') next.eventCount = next.events.length;

  await writeJsonFile(getSessionFilePath(sessionId), next);
  return next;
}

async function appendInvestigationEvent(sessionId, event, data) {
  const session = await saveInvestigationSession(sessionId, {});
  const nextEvents = [
    ...(Array.isArray(session.events) ? session.events : []),
    {
      index: typeof session.eventCount === 'number' ? session.eventCount : 0,
      event,
      data,
      timestamp: new Date().toISOString(),
    },
  ].slice(-200);

  return saveInvestigationSession(sessionId, {
    events: nextEvents,
    eventCount: (session.eventCount || 0) + 1,
  });
}

async function findLatestVehicleSession(vehicleId) {
  if (!vehicleId) return null;

  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const entries = await fs.readdir(SESSION_DIR);
    const sessions = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) => readJsonFile(path.join(SESSION_DIR, entry), null)),
    );

    const matching = sessions
      .filter((session) => session && session.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    return matching[0] || null;
  } catch {
    return null;
  }
}

async function clearInvestigationSession(sessionId) {
  if (!sessionId) return;
  try {
    await fs.unlink(getSessionFilePath(sessionId));
  } catch {
    // File doesn't exist, that's fine
  }
}

async function clearVehicleInvestigationSessions(vehicleId) {
  if (!vehicleId) return;

  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
    const entries = await fs.readdir(SESSION_DIR);
    await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map(async (entry) => {
          const filePath = path.join(SESSION_DIR, entry);
          const session = await readJsonFile(filePath, null);
          if (session?.vehicleId === vehicleId) {
            try {
              await fs.unlink(filePath);
            } catch {
              // Ignore races with concurrent cleanup.
            }
          }
        }),
    );
  } catch {
    // Ignore cleanup failures.
  }
}

module.exports = {
  loadCaseFile,
  appendCaseNote,
  clearCaseFile,
  loadInvestigationSession,
  saveInvestigationSession,
  appendInvestigationEvent,
  findLatestVehicleSession,
  clearInvestigationSession,
  clearVehicleInvestigationSessions,
};
