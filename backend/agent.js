const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./memory');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const INVESTIGATION_MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || 'claude-opus-4-1-20250805';
const FOLLOW_UP_MODEL = process.env.ANTHROPIC_FOLLOW_UP_MODEL || INVESTIGATION_MODEL;
const BUDGET = 60000;
const CAMERA_TARGET_VIEWS = [
  'front',
  'rear',
  'left',
  'right',
  'top',
  'underbody',
  'front_left',
  'front_right',
  'rear_left',
  'rear_right',
  'wheel_closeup',
];
const CAMERA_HOTSPOTS = [
  'engine_bay',
  'battery_area',
  'coolant_reservoir',
  'oil_dipstick',
  'engine_oil_cap',
  'air_filter_box',
  'radiator_front',
  'front_bumper',
  'rear_bumper',
  'left_body_panel',
  'right_body_panel',
  'driver_door',
  'passenger_door',
  'windshield',
  'roof_center',
  'trunk_area',
  'exhaust_rear',
  'underbody_front',
  'underbody_mid',
  'underbody_rear',
  'front_left_tire',
  'front_right_tire',
  'rear_left_tire',
  'rear_right_tire',
  'front_left_brake',
  'front_right_brake',
  'rear_left_brake',
  'rear_right_brake',
  'front_left_suspension',
  'front_right_suspension',
  'rear_left_suspension',
  'rear_right_suspension',
];

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
- Maintain a working memory of facts already established by the user

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
  "targetView":"${CAMERA_TARGET_VIEWS.join('|')}",
  "hotspotId":"${CAMERA_HOTSPOTS.join('|')}",
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
    "targetView": "${CAMERA_TARGET_VIEWS.join('|')}",
    "hotspotId": "${CAMERA_HOTSPOTS.join('|')}",
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
- Before asking any clarification question, review the CURRENT INVESTIGATION MEMORY provided in the system prompt.
- Do not ask for a fact that is already established unless the user contradicted themselves or the fact remains genuinely ambiguous.
- Do not loop back to generic versions of earlier questions once sound type, timing, or brake symptoms have already been established.
- If the sound is already established as squealing, screeching, or grinding while braking, and the user denies vibration, pulling, or a soft pedal, stop repeating brake symptom questions and move to the next highest-value unresolved detail or request a brake/wheel photo.
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
- Prefer tire-specific hotspots for tire, wheel, brake, rim, hub, vibration, or steering complaints: front_left_tire, front_right_tire, rear_left_tire, rear_right_tire.
- Prefer brake-specific hotspots when the request is about rotor, caliper, brake pads, grinding, squealing, or brake dust: front_left_brake, front_right_brake, rear_left_brake, rear_right_brake.
- Prefer engine-bay hotspots for under-hood symptoms: engine_bay, battery_area, coolant_reservoir, oil_dipstick, engine_oil_cap, air_filter_box, radiator_front.
- Prefer exterior hotspots for visible body, glass, bumper, trunk, exhaust, roof, or underbody issues: front_bumper, rear_bumper, left_body_panel, right_body_panel, driver_door, passenger_door, windshield, roof_center, trunk_area, exhaust_rear, underbody_front, underbody_mid, underbody_rear.
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

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n');
  }
  return '';
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

function normalizeUserText(text) {
  return text
    .replace(/Vehicle history:\s*[\s\S]*?(?=\nSymptom described:|$)/i, '')
    .replace(/Symptom described:\s*/i, '')
    .trim();
}

function extractClarificationQuestions(messages) {
  return messages
    .filter((message) => message?.role === 'assistant')
    .map((message) => parseJsonBlock(contentToText(message.content), 'follow_up_question'))
    .filter(Boolean);
}

function classifyClarificationQuestion(question = '') {
  const text = question.toLowerCase();
  if (/(what kind of sound|what specific sound|grinding|squealing|clicking|knocking|humming|rattling)/.test(text)) {
    return 'sound_type';
  }
  if (/(when exactly|when do you hear|while braking|while breaking|when braking|when breaking|turning|accelerating|driving|specific speeds|engine first starts|idling)/.test(text)) {
    return 'timing';
  }
  if (/(vibration|pedal|steering wheel|pulling|soft|spongy|brake force|stopping distance)/.test(text)) {
    return 'brake_symptoms';
  }
  if (/(front|rear|engine bay|specific area|which side|left|right)/.test(text)) {
    return 'location';
  }
  return 'other';
}

function extractFactsFromMessages(messages) {
  const facts = {
    soundType: null,
    timing: null,
    location: null,
    vibration: null,
    pulling: null,
    softPedal: null,
  };

  const userTexts = messages
    .filter((message) => message?.role === 'user')
    .map((message) => normalizeUserText(contentToText(message.content)))
    .filter(Boolean);

  for (const entry of userTexts) {
    const text = entry.toLowerCase();

    if (/(screech|screeching)/.test(text)) facts.soundType = 'screeching';
    if (/(squeal|squeeling|squealing)/.test(text)) facts.soundType = 'squealing';
    if (/(grind|grinding)/.test(text)) facts.soundType = 'grinding';
    if (/(knock|knocking)/.test(text)) facts.soundType = 'knocking';
    if (/(click|clicking)/.test(text)) facts.soundType = 'clicking';
    if (/(hum|humming)/.test(text)) facts.soundType = 'humming';
    if (/(rattle|rattling)/.test(text)) facts.soundType = 'rattling';

    if (/(while braking|while breaking|when braking|when breaking|press the brakes|pressing the brakes|hit the brakes|when i brake)/.test(text)) facts.timing = 'while braking';
    else if (/(while turning|when turning|turn the steering wheel|when i turn)/.test(text)) facts.timing = 'while turning';
    else if (/(while accelerating|when accelerating|when i accelerate)/.test(text)) facts.timing = 'while accelerating';
    else if (/(engine first starts|when starting|on startup|when the engine starts)/.test(text)) facts.timing = 'on engine start';
    else if (/(while driving|constantly while driving|all the time|constant)/.test(text)) facts.timing = 'while driving';
    else if (/(idling|when idling)/.test(text)) facts.timing = 'while idling';

    if (/(front|from the front|front end)/.test(text)) facts.location = 'front';
    else if (/(rear|back of the car|from the back)/.test(text)) facts.location = 'rear';
    else if (/(engine bay|under the hood|bonnet area)/.test(text)) facts.location = 'engine bay';

    if (/(nothing physical|nothing noticeable|nothing as far as i've noticed|no physical symptoms|don['’]?t feel anything|do not feel anything)/.test(text)) {
      facts.vibration = 'no';
      facts.pulling = 'no';
      facts.softPedal = 'no';
    }

    if (/(no vibration|without vibration|not vibrating)/.test(text)) facts.vibration = 'no';
    else if (/(vibration|vibrating|shaking)/.test(text)) facts.vibration = 'yes';

    if (/(not pulling|no pulling|doesn['’]?t pull)/.test(text)) facts.pulling = 'no';
    else if (/(pulling to one side|pulls to one side|pulling)/.test(text)) facts.pulling = 'yes';

    if (/(pedal feels normal|not soft|not spongy|nothing soft|no soft pedal|no spongy pedal)/.test(text)) facts.softPedal = 'no';
    else if (/(soft pedal|spongy pedal|pedal feels soft|pedal feels spongy)/.test(text)) facts.softPedal = 'yes';
  }

  return facts;
}

function buildInvestigationMemory(messages) {
  const facts = extractFactsFromMessages(messages);
  const askedCategories = Array.from(
    new Set(extractClarificationQuestions(messages).map((item) => classifyClarificationQuestion(item.question))),
  ).filter(Boolean);

  const knownFacts = [
    facts.soundType ? `- Sound type: ${facts.soundType}` : '- Sound type: unresolved',
    facts.timing ? `- Timing: ${facts.timing}` : '- Timing: unresolved',
    facts.location ? `- Location: ${facts.location}` : '- Location: unresolved',
    facts.vibration ? `- Vibration reported: ${facts.vibration}` : '- Vibration reported: unresolved',
    facts.pulling ? `- Pulling reported: ${facts.pulling}` : '- Pulling reported: unresolved',
    facts.softPedal ? `- Soft or spongy pedal reported: ${facts.softPedal}` : '- Soft or spongy pedal reported: unresolved',
  ];

  const notes = [];
  if (askedCategories.length > 0) {
    notes.push(`Clarification categories already asked: ${askedCategories.join(', ')}`);
  }
  if (
    (facts.soundType === 'squealing' || facts.soundType === 'screeching' || facts.soundType === 'grinding') &&
    facts.timing === 'while braking' &&
    facts.vibration === 'no' &&
    facts.pulling === 'no' &&
    facts.softPedal === 'no'
  ) {
    notes.push('Brake-noise pattern is already established. Do not ask another generic sound/timing/brake-symptom question. Ask only one new unresolved detail or request a brake/wheel photo.');
  }
  if (facts.soundType === 'grinding' && facts.timing === 'while braking') {
    notes.push('Grinding while braking is already established and is potentially metal-on-metal brake wear. Do not ask another generic sound, timing, vibration, pulling, or pedal-feel question. Request one close-up brake/wheel photo next unless a final safety brief is already justified.');
  }

  return [
    'KNOWN FACTS:',
    ...knownFacts,
    '',
    'ANTI-REPEAT NOTES:',
    ...(notes.length > 0 ? notes.map((note) => `- ${note}`) : ['- No special anti-repeat notes yet.']),
  ].join('\n');
}

function isBrakeGrindingEstablished(messages) {
  const facts = extractFactsFromMessages(messages);
  return facts.soundType === 'grinding' && facts.timing === 'while braking';
}

function buildBrakeGrindingEvidenceRequest() {
  const guidance = {
    headline: 'Photograph the brake area',
    targetView: 'wheel_closeup',
    hotspotId: 'front_left_brake',
    rotationY: 45,
    tiltX: 0,
    focusArea: 'brake rotor',
    captureHint: 'Close view through wheel spokes',
    animation: 'pulse-wheel',
  };

  return {
    instruction:
      'Park safely on level ground, turn the engine off, and take one clear close-up photo through the wheel spokes of the brake rotor and caliper on the wheel where the grinding is loudest. If you cannot tell which side, use a front wheel and fill the frame with the rotor/caliper area.',
    why:
      'Grinding only while braking often means metal-on-metal pad or rotor wear, and this photo can show pad thickness, rotor scoring, or brake hardware damage.',
    guidance,
  };
}

function shouldReplaceBrakeGrindingQuestion(messages, followUpQuestion) {
  if (!followUpQuestion?.question || !isBrakeGrindingEstablished(messages)) return false;
  return ['sound_type', 'timing', 'brake_symptoms'].includes(classifyClarificationQuestion(followUpQuestion.question));
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

async function buildFallbackSessionMessages(session) {
  const history = await memory.loadCaseFile(session.vehicleId);
  const baseMessages = [
    {
      role: 'user',
      content: [{ type: 'text', text: `Vehicle history:\n${JSON.stringify(history, null, 2)}` }],
    },
  ];

  if (session.followUpQuestion) {
    baseMessages.push({
      role: 'assistant',
      content: `\`\`\`follow_up_question\n${JSON.stringify(session.followUpQuestion, null, 2)}\n\`\`\``,
    });
  } else if (session.evidenceRequest) {
    baseMessages.push({
      role: 'assistant',
      content: `\`\`\`evidence_request\n${JSON.stringify(session.evidenceRequest, null, 2)}\n\`\`\``,
    });
  } else if (typeof session.fullResponse === 'string' && session.fullResponse.trim()) {
    baseMessages.push({
      role: 'assistant',
      content: session.fullResponse,
    });
  }

  return baseMessages;
}

async function getSessionMessages(session) {
  if (Array.isArray(session?.messages)) return session.messages;
  return buildFallbackSessionMessages(session);
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
    system: `${INVESTIGATION_SYSTEM_PROMPT}\n\nCURRENT INVESTIGATION MEMORY:\n${buildInvestigationMemory(messages)}`,
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

  const request = {
    max_tokens: 500,
    system: FOLLOW_UP_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: contextParts.join('\n\n') }],
      },
    ],
  };

  let response;
  try {
    response = await client.messages.create({
      ...request,
      model: FOLLOW_UP_MODEL,
    });
  } catch (error) {
    const isMissingConfiguredModel =
      FOLLOW_UP_MODEL !== INVESTIGATION_MODEL &&
      (error?.status === 404 || /model:|not_found_error/i.test(error?.message || ''));

    if (!isMissingConfiguredModel) throw error;

    console.warn(`Follow-up model ${FOLLOW_UP_MODEL} unavailable; falling back to ${INVESTIGATION_MODEL}.`);
    response = await client.messages.create({
      ...request,
      model: INVESTIGATION_MODEL,
    });
  }

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

  await storeSession(sessionId, vehicleId, {
    messages,
    totalTokensUsed: 0,
    fullResponse: '',
  });

  try {
    const { finalMessage, fullResponse } = await requestClaude(messages, sseEmitter);
    const totalTokensUsed = updateBudgetFromMessage(finalMessage, 0, sseEmitter);

    const evidenceRequest = parseJsonBlock(fullResponse, 'evidence_request');
    if (evidenceRequest) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.send('evidence_request', evidenceRequest);
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(fullResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      if (shouldReplaceBrakeGrindingQuestion(messages, followUpQuestion)) {
        const evidenceRequest = buildBrakeGrindingEvidenceRequest();
        await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
        sseEmitter.send('camera_guidance', evidenceRequest.guidance);
        sseEmitter.send('evidence_request', evidenceRequest);
        sseEmitter.end();
        return;
      }
      await storeSession(sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.send('follow_up_question', followUpQuestion);
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

  const hasStoredMessages = Array.isArray(session?.messages);
  const messages = await getSessionMessages(session);
  const fullResponse = typeof session.fullResponse === 'string' ? session.fullResponse : '';
  const { vehicleId } = session;
  const resumedMessages = [
    ...messages,
    ...(hasStoredMessages && fullResponse.trim() ? [{ role: 'assistant', content: fullResponse }] : []),
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
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.send('evidence_request', evidenceRequest);
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(newResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      if (shouldReplaceBrakeGrindingQuestion(resumedMessages, followUpQuestion)) {
        const evidenceRequest = buildBrakeGrindingEvidenceRequest();
        await storeSession(sessionId, vehicleId, {
          messages: resumedMessages,
          totalTokensUsed,
          fullResponse: newResponse,
        });
        sseEmitter.send('camera_guidance', evidenceRequest.guidance);
        sseEmitter.send('evidence_request', evidenceRequest);
        sseEmitter.end();
        return;
      }
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.send('follow_up_question', followUpQuestion);
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

  const hasStoredMessages = Array.isArray(session?.messages);
  const messages = await getSessionMessages(session);
  const fullResponse = typeof session.fullResponse === 'string' ? session.fullResponse : '';
  const { vehicleId } = session;
  const resumedMessages = [
    ...messages,
    ...(hasStoredMessages && fullResponse.trim() ? [{ role: 'assistant', content: fullResponse }] : []),
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
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.send('evidence_request', evidenceRequest);
      sseEmitter.end();
      return;
    }

    const followUpQuestion = parseJsonBlock(newResponse, 'follow_up_question');
    if (followUpQuestion) {
      emitPhase(sseEmitter, 'EVIDENCE_GAP');
      if (shouldReplaceBrakeGrindingQuestion(resumedMessages, followUpQuestion)) {
        const evidenceRequest = buildBrakeGrindingEvidenceRequest();
        await storeSession(sessionId, vehicleId, {
          messages: resumedMessages,
          totalTokensUsed,
          fullResponse: newResponse,
        });
        sseEmitter.send('camera_guidance', evidenceRequest.guidance);
        sseEmitter.send('evidence_request', evidenceRequest);
        sseEmitter.end();
        return;
      }
      await storeSession(sessionId, vehicleId, {
        messages: resumedMessages,
        totalTokensUsed,
        fullResponse: newResponse,
      });
      sseEmitter.send('follow_up_question', followUpQuestion);
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
