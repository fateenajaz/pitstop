const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./memory');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const INVESTIGATION_MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-opus-4-1-20250805';
const FOLLOW_UP_MODEL = process.env.ANTHROPIC_FOLLOW_UP_MODEL || 'claude-sonnet-4-20250514';
const BUDGET = 60000;

const INVESTIGATION_SYSTEM_PROMPT = `
You are Pit Stop, an autonomous vehicle diagnostic investigation agent.

You run multi-phase investigations with explicit, user-visible progress.
You may remain in a phase until you are confident enough to proceed.
Do not skip phases casually.

INVESTIGATION PHASES:

[PHASE 1 — INTAKE]
- Read the symptom description carefully
- Analyze the uploaded image if present
- If the symptom description is vague, incomplete, or ambiguous, ask targeted clarification questions before requesting photos
- Form initial hypotheses and decide whether more evidence is needed

[PHASE 2 — EVIDENCE GAP]
- Identify exactly one photo that would most reduce uncertainty
- Ask for only one photo at a time
- You may ask a clarification question instead of a photo if missing context is the bigger blocker
- Stop after the evidence request or clarification question and wait for the user's reply

[PHASE 3 — ANALYSIS]
- Analyze the new evidence in detail
- Update your hypothesis ranking and confidence
- If the new evidence is still insufficient, ask for additional photos, descriptions, or symptom details until confidence improves
- Request one more item of evidence only if it is truly necessary and be specific about what is missing

[PHASE 4 — VERIFICATION]
- Challenge the top diagnosis
- Consider contradictory evidence and alternatives
- Only proceed if you can defend the conclusion

[PHASE 5 — BRIEF]
- Output the final diagnosis JSON block

WHILE YOU WORK, YOU MUST EMIT MACHINE-READABLE TAGS IN THE TEXT STREAM:

1. Whenever you enter a phase or materially update the status, emit:
<phase_update>{"phase":"INTAKE|EVIDENCE_GAP|ANALYSIS|VERIFICATION|BRIEF","status":"short active sentence","progress":0.0}</phase_update>

Rules:
- progress is a number from 0.0 to 1.0
- Emit a new phase_update when the phase changes
- You may emit multiple updates in the same phase as confidence improves

2. When you need a user photo, emit:
<camera_guidance>{
  "headline":"short instruction headline",
  "targetView":"front|rear|left|right|top|underbody|front_left|front_right|rear_left|rear_right|wheel_closeup",
  "hotspotId":"engine_bay|radiator_front|battery_area|front_left_brake|front_right_brake|rear_left_suspension|rear_right_suspension|underbody_mid|exhaust_rear|roof_center",
  "rotationY":90,
  "tiltX":0,
  "focusArea":"very short noun phrase",
  "captureHint":"short framing guidance",
  "animation":"rotate-left|rotate-right|tilt-up|tilt-down|pulse-front|pulse-rear|pulse-side|pulse-roof|pulse-wheel"
}</camera_guidance>

3. Then emit the photo request as:
\`\`\`evidence_request
{
  "instruction": "<precise instructions for exactly what photo to take, from what angle, in what conditions>",
  "why": "<one sentence explaining what you expect this photo to reveal>",
  "guidance": {
    "headline": "<same short headline>",
    "targetView": "front|rear|left|right|top|underbody|front_left|front_right|rear_left|rear_right|wheel_closeup",
    "hotspotId": "engine_bay|radiator_front|battery_area|front_left_brake|front_right_brake|rear_left_suspension|rear_right_suspension|underbody_mid|exhaust_rear|roof_center",
    "rotationY": <number>,
    "tiltX": <number>,
    "focusArea": "<short noun phrase>",
    "captureHint": "<short framing guidance>",
    "animation": "rotate-left|rotate-right|tilt-up|tilt-down|pulse-front|pulse-rear|pulse-side|pulse-roof|pulse-wheel"
  }
}
\`\`\`

If you need clarification before or between photos, emit:
\`\`\`follow_up_question
{
  "question": "<one concise, targeted question about the symptom, timing, sound, warning light, conditions, or other missing detail>",
  "why": "<one sentence explaining why this clarification matters>"
}
\`\`\`

4. When you finish, emit:
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
      "x": <pixel x>,
      "y": <pixel y>,
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
- Your progress/status text must be concise and factual.
- Never mention these tag rules to the user.
- Pixel coordinates must map to the real uploaded image pixels.
- Never produce a generic diagnosis. Reference specific visual evidence.
- If the image is insufficient, request a better angle instead of guessing.
- If a submitted photo is blurry, too dark, obstructed, too far away, unrelated to the requested area, or does not match the requested instruction, explicitly reject it and request a replacement photo.
- When requesting a replacement photo, explain briefly what was wrong with the previous one and what must be different in the next shot.
- If the user prompt is too vague to support useful photo guidance, ask a clarification question first.
- Do not output a final diagnosis until you are reasonably confident and can defend it with the available evidence.
- It is acceptable to ask for multiple rounds of photos and descriptions if that is required to reach a reliable conclusion.
- For car-photo guidance, be spatially explicit so a UI can animate the requested camera angle.
- When possible, choose the closest hotspotId so the UI can zoom to an exact subsystem.
`;

const PHASE_LABELS = {
  INTAKE: 'PHASE 1 — INTAKE',
  EVIDENCE_GAP: 'PHASE 2 — EVIDENCE GAP',
  ANALYSIS: 'PHASE 3 — ANALYSIS',
  VERIFICATION: 'PHASE 4 — VERIFICATION',
  BRIEF: 'PHASE 5 — BRIEF',
};

const FOLLOW_UP_SYSTEM_PROMPT = `
You are Pit Stop, an automotive diagnostic assistant.

You may do these things:
- answer brief follow-up questions about an existing vehicle diagnosis
- respond politely to greetings, thanks, and short casual acknowledgements
- ask the user to stay on topic if the request is unrelated to vehicle diagnostics, evidence collection, repair decisions, or the current case

Behavior rules:
- Keep answers concise and practical
- If the user says hello, hi, thanks, or gives a compliment, respond naturally and briefly
- If the user asks something unrelated to automotive diagnostics, politely say you are focused on car diagnosis and repair guidance
- If the user asks about the current diagnosis, use the provided brief and conversation context
- Do not invent evidence you do not have
- Do not emit tags, JSON, or markdown fences
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
      },
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

function emitPhase(sseEmitter, phase) {
  if (!phase || sseEmitter.emittedPhases.has(phase)) return;
  sseEmitter.emittedPhases.add(phase);
  sseEmitter.send('phase', { phase, label: PHASE_LABELS[phase] || phase });
}

function emitPhaseUpdate(sseEmitter, update) {
  if (!update || !update.phase) return;
  emitPhase(sseEmitter, update.phase);
  sseEmitter.send('phase_update', {
    phase: update.phase,
    label: PHASE_LABELS[update.phase] || update.phase,
    status: update.status || '',
    progress: typeof update.progress === 'number' ? update.progress : null,
  });
}

function emitTaggedJson(snapshot, tagName, state, onValue) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let match;
  let seen = 0;

  while ((match = regex.exec(snapshot))) {
    seen += 1;
    if (seen <= state.count) continue;

    try {
      onValue(JSON.parse(match[1].trim()));
    } catch {
      // Ignore malformed partial payloads.
    }
  }

  state.count = seen;
}

function attachStreamEmitters(stream, sseEmitter, parserState) {
  stream.on('text', (_, textSnapshot) => {
    parserState.fullText = textSnapshot;

    emitTaggedJson(textSnapshot, 'phase_update', parserState.phaseState, (update) => {
      emitPhaseUpdate(sseEmitter, update);
    });

    emitTaggedJson(textSnapshot, 'camera_guidance', parserState.guidanceState, (guidance) => {
      sseEmitter.send('camera_guidance', guidance);
    });
  });

  stream.on('thinking', (thinkingDelta) => {
    sseEmitter.send('thinking', { text: thinkingDelta });
  });
}

function updateBudgetFromMessage(message, totalTokensUsed, sseEmitter) {
  if (!message.usage) return totalTokensUsed;

  const nextTotal = totalTokensUsed + (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
  sseEmitter.send('budget', {
    used: nextTotal,
    total: BUDGET,
    remaining: Math.max(0, BUDGET - nextTotal),
  });
  return nextTotal;
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
  await memory.saveInvestigationSession(sessionId, { vehicleId, ...data });
}

async function getSession(sessionId) {
  return memory.loadInvestigationSession(sessionId);
}

async function requestClaude(messages, sseEmitter) {
  const parserState = {
    fullText: '',
    phaseState: { count: 0 },
    guidanceState: { count: 0 },
  };

  const stream = client.messages.stream({
    model: INVESTIGATION_MODEL,
    max_tokens: 4096,
    system: INVESTIGATION_SYSTEM_PROMPT,
    messages,
  });

  attachStreamEmitters(stream, sseEmitter, parserState);
  const finalMessage = await stream.finalMessage();

  return {
    finalMessage,
    fullResponse: finalMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join(''),
  };
}

async function answerFollowUp(vehicleId, promptText, chatMessages = [], brief = null) {
  const history = await memory.loadCaseFile(vehicleId);
  const transcript = chatMessages
    .filter((message) => message && (message.type === 'user' || message.type === 'agent' || message.type === 'system'))
    .map((message) => {
      const speaker = message.type === 'user' ? 'User' : 'Assistant';
      return `${speaker}: ${message.text || message.content || ''}`;
    })
    .filter(Boolean)
    .slice(-12)
    .join('\n');

  const contextParts = [
    `Vehicle history:\n${JSON.stringify(history, null, 2)}`,
    brief ? `Diagnostic brief:\n${JSON.stringify(brief, null, 2)}` : '',
    transcript ? `Recent chat transcript:\n${transcript}` : '',
    `User follow-up:\n${promptText}`,
  ].filter(Boolean);

  const response = await client.messages.create({
    model: FOLLOW_UP_MODEL,
    max_tokens: 500,
    system: FOLLOW_UP_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: contextParts.join('\n\n') }],
      },
    ],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

async function runInvestigation(vehicleId, sessionId, symptomText, imageBuffer, imageMimeType, sseEmitter) {
  sseEmitter.emittedPhases = new Set();
  emitPhaseUpdate(sseEmitter, {
    phase: 'INTAKE',
    status: 'Reviewing the symptom and initial evidence.',
    progress: 0.08,
  });

  const history = await memory.loadCaseFile(vehicleId);
  const historyText = `Vehicle history:\n${JSON.stringify(history, null, 2)}`;
  const messages = [
    {
      role: 'user',
      content: [{ type: 'text', text: historyText }, ...buildInitialContent(symptomText, imageBuffer, imageMimeType)],
    },
  ];

  try {
    const { finalMessage, fullResponse } = await requestClaude(messages, sseEmitter);
    const totalTokensUsed = updateBudgetFromMessage(finalMessage, 0, sseEmitter);

    const evidenceRequest = parseJsonBlock(fullResponse, 'evidence_request');
    if (evidenceRequest) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('evidence_request', evidenceRequest);
      await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(fullResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('follow_up_question', followUpQuestion);
      await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.end();
      return;
    }

    const brief = parseJsonBlock(fullResponse, 'diagnostic_brief');
    if (brief) {
      await finalizeBrief(vehicleId, brief, sseEmitter);
      return;
    }

    sseEmitter.send('done', { error: 'No diagnostic brief or evidence request found in the Claude response.' });
    sseEmitter.end();
  } catch (error) {
    console.error('Investigation API error:', error);
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
  emitPhaseUpdate(sseEmitter, {
    phase: 'ANALYSIS',
    status: 'Analyzing the newly requested photo.',
    progress: 0.56,
  });

  const { messages, fullResponse, vehicleId } = session;
  const resumedMessages = [
    ...messages,
    { role: 'assistant', content: fullResponse },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the photo you requested.' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMimeType,
            data: imageBuffer.toString('base64'),
          },
        },
      ],
    },
  ];

  try {
    const { finalMessage, fullResponse: newResponse } = await requestClaude(resumedMessages, sseEmitter);
    const totalTokensUsed = updateBudgetFromMessage(finalMessage, session.totalTokensUsed || 0, sseEmitter);

    const evidenceRequest = parseJsonBlock(newResponse, 'evidence_request');
    if (evidenceRequest) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('evidence_request', evidenceRequest);
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(newResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('follow_up_question', followUpQuestion);
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.end();
      return;
    }

    const brief = parseJsonBlock(newResponse, 'diagnostic_brief');
    if (brief) {
      await finalizeBrief(vehicleId, brief, sseEmitter);
      return;
    }

    sseEmitter.send('done', { error: 'No diagnostic brief or follow-up evidence request found in the Claude response.' });
    sseEmitter.end();
  } catch (error) {
    console.error('Resume investigation API error:', error);
    sseEmitter.send('done', { error: error.message });
    sseEmitter.end();
  }
}

async function resumeInvestigationWithText(sessionId, answerText, sseEmitter) {
  const session = await getSession(sessionId);
  if (!session) {
    sseEmitter.send('done', { error: 'Session not found' });
    sseEmitter.end();
    return;
  }

  sseEmitter.emittedPhases = new Set();
  emitPhaseUpdate(sseEmitter, {
    phase: 'ANALYSIS',
    status: 'Reviewing the added symptom details.',
    progress: 0.34,
  });

  const { messages, fullResponse, vehicleId } = session;
  const resumedMessages = [
    ...messages,
    { role: 'assistant', content: fullResponse },
    {
      role: 'user',
      content: [{ type: 'text', text: answerText }],
    },
  ];

  try {
    const { finalMessage, fullResponse: newResponse } = await requestClaude(resumedMessages, sseEmitter);
    const totalTokensUsed = updateBudgetFromMessage(finalMessage, session.totalTokensUsed || 0, sseEmitter);

    const evidenceRequest = parseJsonBlock(newResponse, 'evidence_request');
    if (evidenceRequest) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('evidence_request', evidenceRequest);
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(newResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      sseEmitter.send('follow_up_question', followUpQuestion);
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.end();
      return;
    }

    const brief = parseJsonBlock(newResponse, 'diagnostic_brief');
    if (brief) {
      await finalizeBrief(vehicleId, brief, sseEmitter);
      return;
    }

    sseEmitter.send('done', { error: 'No diagnostic brief, clarification question, or evidence request found in the Claude response.' });
    sseEmitter.end();
  } catch (error) {
    console.error('Resume investigation with text API error:', error);
    sseEmitter.send('done', { error: error.message });
    sseEmitter.end();
  }
}

module.exports = { runInvestigation, resumeInvestigation, resumeInvestigationWithText, answerFollowUp };
