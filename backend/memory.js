const fs = require('fs').promises;
const path = require('path');

const CASE_DIR = path.join(__dirname, 'case-files');

async function loadCaseFile(vehicleId) {
  const filePath = path.join(CASE_DIR, `${vehicleId}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { vehicleId, notes: [], investigations: [] };
  }
}

async function appendCaseNote(vehicleId, note) {
  const caseFile = await loadCaseFile(vehicleId);
  caseFile.notes.push({ timestamp: new Date().toISOString(), note });
  const filePath = path.join(CASE_DIR, `${vehicleId}.json`);
  await fs.mkdir(CASE_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(caseFile, null, 2));
}

module.exports = { loadCaseFile, appendCaseNote };
