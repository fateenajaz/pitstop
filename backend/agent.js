const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./memory');

// In-memory store for paused sessions
const sessions = new Map();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INVESTIGATION_SYSTEM_PROMPT = `
You are Pit Stop, an autonomous vehicle diagnostic investigation agent.

You run multi-phase investigations with a token budget you can see. 
Self-manage your depth — if evidence is ambiguous, go deeper. 
If the case is clear, be efficient.

INVESTIGATION PHASES (you decide when to move between them):

[PHASE 1 — INTAKE]
- Read the symptom description carefully
- Load and analyze any uploaded image at full resolution
- Form your initial 3 ranked hypotheses with confidence scores
- Decide: do you have enough evidence to diagnose? 
  - If confidence > 0.80 on top hypothesis: skip to PHASE 4
  - If ambiguous: proceed to PHASE 2

[PHASE 2 — EVIDENCE GAP]
- Identify exactly what visual evidence would disambiguate your hypotheses
- Output a single specific photo request using this exact JSON block:
  \`\`\`evidence_request
  {
    "instruction": "<precise instructions for exactly what photo to take, from what angle, in what conditions>",
    "why": "<one sentence explaining what you expect this photo to reveal>"
  }
  \`\`\`
- STOP and wait. Do not proceed until new evidence arrives.

[PHASE 3 — ANALYSIS]
- Analyze the new photo at full 3.75MP resolution
- Use precise pixel coordinates for fault localization
- Update hypothesis confidence scores
- Decide: is further evidence needed? (maximum one evidence request per session)

[PHASE 4 — VERIFICATION]
- Challenge your top hypothesis:
  - What visual evidence contradicts it?
  - What alternative explanations fit equally well?
  - Adjust confidence down if contradictions exist
- Only proceed if you can defend the diagnosis

[PHASE 5 — BRIEF]
- Output the complete Diagnostic Brief as a single JSON block:
  \`\`\`diagnostic_brief
  {
    "primary_fault": "<name of the fault>",
    "confidence": <0.0-1.0>,
    "urgency": "critical|high|moderate|low",
    "urgency_label": "<e.g. 'Do not drive — arrange tow'>",
    "plain_explanation": "<2-3 sentences a non-mechanic understands>",
    "what_happens_if_ignored": "<one sentence>",
    "estimated_cost_band": "<e.g. AED 300–700>",
    "recommended_action": "<specific next step>",
    "annotations": [
      {
        "x": <pixel x, top-left of bounding box>,
        "y": <pixel y, top-left of bounding box>,
        "width": <width in pixels>,
        "height": <height in pixels>,
        "label": "<fault label>",
        "confidence": <0.0-1.0>
      }
    ],
    "case_note": "<one line for the vehicle history file, starting with date>"
  }
  \`\`\`

IMPORTANT RULES:
- Pixel coordinates in annotations are 1:1 with the actual image pixels. Do NOT normalize.
- You are aware of your token budget. If it is running low, compress your reasoning and proceed to output.
- Never produce a generic diagnosis. Every output must reference specific visual evidence.
- The case_note must reference what was visually observed, not just what was concluded.
`;

function buildInitialContent(symptomText, imageBuffer, imageMimeType) {
  const content = [];
  if (symptomText) {
    content.push({ type: 'text', text: `Symptom described: ${symptomText}` });
  }
  if (imageBuffer) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMimeType,
        data: imageBuffer.toString('base64'),
      }
    });
  }
  return content;
}

function parseJsonBlock(text, blockName) {
  const regex = new RegExp('```' + blockName + '\\s*([\\s\\S]*?)```', 'i');
  const match = text.match(regex);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

const PHASE_LABELS = {
  INTAKE: 'PHASE 1 — INTAKE',
  EVIDENCE_GAP: 'PHASE 2 — EVIDENCE GAP',
  ANALYSIS: 'PHASE 3 — ANALYSIS',
  VERIFICATION: 'PHASE 4 — VERIFICATION',
  BRIEF: 'PHASE 5 — BRIEF',
};

function emitPhase(sseEmitter, phase) {
  if (sseEmitter.emittedPhases.has(phase)) return;
  sseEmitter.emittedPhases.add(phase);
  sseEmitter.send('phase', { phase, label: PHASE_LABELS[phase] });
}

async function finalizeBrief(vehicleId, brief, sseEmitter) {
  emitPhase(sseEmitter, 'VERIFICATION');
  emitPhase(sseEmitter, 'BRIEF');
  sseEmitter.send('brief', brief);

  if (brief.annotations) {
    for (const ann of brief.annotations) {
      sseEmitter.send('annotation', ann);
    }
  }

  if (brief.case_note) {
    await memory.appendCaseNote(vehicleId, brief.case_note);
    sseEmitter.send('case_note', { line: brief.case_note });
  }

  sseEmitter.send('done', {});
  sseEmitter.end();
}

async function storeSession(sessionId, vehicleId, data) {
  sessions.set(sessionId, { vehicleId, ...data });
}

async function getSession(sessionId) {
  return sessions.get(sessionId);
}

async function runInvestigation(vehicleId, sessionId, symptomText, imageBuffer, imageMimeType, sseEmitter) {
  sseEmitter.emittedPhases = new Set();
  emitPhase(sseEmitter, 'INTAKE');
  
  const history = await memory.loadCaseFile(vehicleId);
  const historyText = `Vehicle History:\n` + JSON.stringify(history, null, 2);
  
  let messages = [
    {
      role: "user",
      content: [
        { type: 'text', text: historyText },
        ...buildInitialContent(symptomText, imageBuffer, imageMimeType)
      ]
    }
  ];

  let totalTokensUsed = 0;
  const BUDGET = 60000;

  try {
    const stream = await client.beta.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 60000,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: "xhigh",
        task_budget: { type: "tokens", total: BUDGET }
      },
      betas: ["task-budgets-2026-03-13"],
      system: INVESTIGATION_SYSTEM_PROMPT,
      messages
    });

    let fullResponse = "";

    stream.on('text', (textDelta) => {
      fullResponse += textDelta;
    });

    stream.on('thinking', (thinkingDelta) => {
      sseEmitter.send('thinking', { text: thinkingDelta });
    });

    stream.on('message', async (message) => {
      if (message.usage) {
        totalTokensUsed += (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
        sseEmitter.send('budget', {
          used: totalTokensUsed,
          total: BUDGET,
          remaining: BUDGET - totalTokensUsed
        });
      }

      fullResponse = message.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      const evidenceRequest = parseJsonBlock(fullResponse, 'evidence_request');
      if (evidenceRequest) {
        emitPhase(sseEmitter, 'EVIDENCE_GAP');
        sseEmitter.send('evidence_request', evidenceRequest);
        await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
        sseEmitter.end();
        return;
      }

      const brief = parseJsonBlock(fullResponse, 'diagnostic_brief');
      if (brief) {
        await finalizeBrief(vehicleId, brief, sseEmitter);
      } else {
        sseEmitter.send('done', { error: 'No diagnostic brief found in final response.' });
        sseEmitter.end();
      }
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      sseEmitter.send('done', { error: err.message });
      sseEmitter.end();
    });

  } catch (error) {
    console.error('API Error:', error);
    sseEmitter.send('done', { error: error.message });
    sseEmitter.end();
  }
}

async function resumeInvestigation(sessionId, imageBuffer, imageMimeType, sseEmitter) {
  const session = await getSession(sessionId);
  if (!session) {
    sseEmitter.send('done', { error: 'Session not found' });
    sseEmitter.end();
    return;
  }
  
  sseEmitter.emittedPhases = new Set();
  emitPhase(sseEmitter, 'ANALYSIS');
  
  let { messages, fullResponse, vehicleId } = session;
  
  messages.push({
    role: "assistant",
    content: fullResponse
  });
  
  messages.push({
    role: "user",
    content: [
      { type: 'text', text: "Here is the photo you requested." },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMimeType,
          data: imageBuffer.toString('base64'),
        }
      }
    ]
  });

  let totalTokensUsed = session.totalTokensUsed || 0;
  const BUDGET = 60000;

  try {
    const stream = await client.beta.messages.stream({
      model: "claude-opus-4-7",
      max_tokens: 60000,
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: "xhigh",
        task_budget: { type: "tokens", total: BUDGET }
      },
      betas: ["task-budgets-2026-03-13"],
      system: INVESTIGATION_SYSTEM_PROMPT,
      messages
    });

    let newResponse = "";

    stream.on('text', (textDelta) => {
      newResponse += textDelta;
    });

    stream.on('thinking', (thinkingDelta) => {
      sseEmitter.send('thinking', { text: thinkingDelta });
    });

    stream.on('message', async (message) => {
      if (message.usage) {
        totalTokensUsed += (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
        sseEmitter.send('budget', {
          used: totalTokensUsed,
          total: BUDGET,
          remaining: BUDGET - totalTokensUsed
        });
      }

      newResponse = message.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');

      const brief = parseJsonBlock(newResponse, 'diagnostic_brief');
      if (brief) {
        await finalizeBrief(vehicleId, brief, sseEmitter);
        sessions.delete(sessionId);
      } else {
        sseEmitter.send('done', { error: 'No diagnostic brief found in final response.' });
        sseEmitter.end();
      }
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      sseEmitter.send('done', { error: err.message });
      sseEmitter.end();
    });

  } catch (error) {
    console.error('API Error:', error);
    sseEmitter.send('done', { error: error.message });
    sseEmitter.end();
  }
}

module.exports = { runInvestigation, resumeInvestigation };
