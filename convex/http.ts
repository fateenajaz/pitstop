import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const INVESTIGATION_MODEL = process.env.ANTHROPIC_INVESTIGATION_MODEL || "claude-opus-4-1-20250805";
const FOLLOW_UP_MODEL = process.env.ANTHROPIC_FOLLOW_UP_MODEL || INVESTIGATION_MODEL;
const BUDGET = 60000;
const DEFAULT_RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const DEFAULT_RATE_LIMIT = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 80);
const AI_RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 12);
const PASSWORD_ITERATIONS = Number(process.env.PASSWORD_HASH_ITERATIONS || 210_000);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);

const CAMERA_TARGET_VIEWS = [
  "front",
  "rear",
  "left",
  "right",
  "top",
  "underbody",
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "wheel_closeup",
];

const CAMERA_HOTSPOTS = [
  "engine_bay",
  "battery_area",
  "coolant_reservoir",
  "oil_dipstick",
  "engine_oil_cap",
  "air_filter_box",
  "radiator_front",
  "front_bumper",
  "rear_bumper",
  "left_body_panel",
  "right_body_panel",
  "driver_door",
  "passenger_door",
  "windshield",
  "roof_center",
  "trunk_area",
  "exhaust_rear",
  "underbody_front",
  "underbody_mid",
  "underbody_rear",
  "front_left_tire",
  "front_right_tire",
  "rear_left_tire",
  "rear_right_tire",
  "front_left_brake",
  "front_right_brake",
  "rear_left_brake",
  "rear_right_brake",
  "front_left_suspension",
  "front_right_suspension",
  "rear_left_suspension",
  "rear_right_suspension",
];

const PHASE_LABELS: Record<string, string> = {
  INTAKE: "PHASE 1 - INTAKE",
  EVIDENCE_GAP: "PHASE 2 - EVIDENCE GAP",
  ANALYSIS: "PHASE 3 - ANALYSIS",
  VERIFICATION: "PHASE 4 - VERIFICATION",
  BRIEF: "PHASE 5 - BRIEF",
};

const INVESTIGATION_SYSTEM_PROMPT = `
You are Pit Stop, an autonomous vehicle diagnostic investigation agent.

You run multi-phase investigations with explicit, user-visible progress.
You may remain in a phase until you are confident enough to proceed.
Do not skip phases casually.

INVESTIGATION PHASES:

[PHASE 1 - INTAKE]
- Read the symptom description carefully
- Analyze the uploaded image if present
- If the symptom description is vague, incomplete, or ambiguous, ask targeted clarification questions before requesting photos
- Form initial hypotheses and decide whether more evidence is needed
- Maintain a working memory of facts already established by the user

[PHASE 2 - EVIDENCE GAP]
- Identify exactly one photo that would most reduce uncertainty
- Ask for only one photo at a time
- You may ask a clarification question instead of a photo if missing context is the bigger blocker
- Stop after the evidence request or clarification question and wait for the user's reply

[PHASE 3 - ANALYSIS]
- Analyze the new evidence in detail
- Update your hypothesis ranking and confidence
- If the new evidence is still insufficient, ask for additional photos, descriptions, or symptom details until confidence improves
- Request one more item of evidence only if it is truly necessary and be specific about what is missing

[PHASE 4 - VERIFICATION]
- Challenge the top diagnosis
- Consider contradictory evidence and alternatives
- Only proceed if you can defend the conclusion

[PHASE 5 - BRIEF]
- Output the final diagnosis JSON block

WHILE YOU WORK, YOU MUST EMIT MACHINE-READABLE TAGS IN THE TEXT STREAM:

1. Whenever you enter a phase or materially update the status, emit:
<phase_update>{"phase":"INTAKE|EVIDENCE_GAP|ANALYSIS|VERIFICATION|BRIEF","status":"short active sentence","progress":0.0}</phase_update>

2. When you need a user photo, emit:
<camera_guidance>{
  "headline":"short instruction headline",
  "targetView":"${CAMERA_TARGET_VIEWS.join("|")}",
  "hotspotId":"${CAMERA_HOTSPOTS.join("|")}",
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
    "targetView": "${CAMERA_TARGET_VIEWS.join("|")}",
    "hotspotId": "${CAMERA_HOTSPOTS.join("|")}",
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
  "urgency_label": "<e.g. 'Do not drive - arrange tow'>",
  "plain_explanation": "<2-3 sentences a non-mechanic understands>",
  "what_happens_if_ignored": "<one sentence>",
  "estimated_cost_band": "<e.g. AED 300-700>",
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

type SseEmitter = {
  emittedPhases: Set<string>;
  send: (event: string, data: unknown) => void;
  end: () => void;
};

function getAllowedOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const configured = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!origin) return configured[0] || "*";
  if (configured.length === 0 && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return configured.includes(origin) ? origin : configured[0] || "https://pitstop.invalid";
}

function corsHeaders(request: Request, methods = "GET,POST,DELETE,OPTIONS") {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(request),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(request: Request, value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json",
    },
  });
}

function optionsResponse(request: Request, methods = "GET,POST,DELETE,OPTIONS") {
  return new Response(null, { headers: corsHeaders(request, methods) });
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
}

async function enforceRateLimit(
  ctx: any,
  request: Request,
  bucket: string,
  limit = DEFAULT_RATE_LIMIT,
  windowMs = DEFAULT_RATE_WINDOW_MS,
) {
  const result = await ctx.runMutation(internal.state.consumeRateLimit, {
    key: `${bucket}:${getClientKey(request)}`,
    limit,
    windowMs,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
      status: 429,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      },
    });
  }

  return null;
}

function pathSuffix(request: Request, prefix: string) {
  const url = new URL(request.url);
  return decodeURIComponent(url.pathname.slice(prefix.length));
}

function randomSessionId() {
  return randomToken(8);
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function hashPassword(password: string, salt: string, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${password}:${getAuthSecret()}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations,
    },
    key,
    256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function validateCredentials(username: string, password: string) {
  if (username.trim().length === 0) {
    return "Username is required.";
  }
  if (password.length === 0) {
    return "Password is required.";
  }
  return null;
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function tokenHash(token: string) {
  return sha256Base64Url(`${token}:${getAuthSecret()}`);
}

async function requireUser(ctx: any, request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const session = await ctx.runQuery(internal.state.getAuthSession, {
    tokenHash: await tokenHash(token),
    now: Date.now(),
  });
  return session?.user || null;
}

async function requireOwnedCar(ctx: any, user: any, vehicleId: string) {
  if (!user || !vehicleId) return null;
  return ctx.runQuery(internal.state.getOwnedCar, {
    userId: user.id,
    publicId: vehicleId,
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fileToImage(file: File | null) {
  if (!file) return null;
  return {
    mediaType: file.type || "image/jpeg",
    base64: arrayBufferToBase64(await file.arrayBuffer()),
  };
}

function parseJsonBlock(text: string, blockName: string) {
  const regex = new RegExp("```" + blockName + "\\s*([\\s\\S]*?)```", "i");
  const match = text.match(regex);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function contentToText(content: any) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
  }
  return "";
}

function normalizeUserText(text: string) {
  return text
    .replace(/Vehicle history:\s*[\s\S]*?(?=\nSymptom described:|$)/i, "")
    .replace(/Symptom described:\s*/i, "")
    .trim();
}

function extractClarificationQuestions(messages: any[]) {
  return messages
    .filter((message) => message?.role === "assistant")
    .map((message) => parseJsonBlock(contentToText(message.content), "follow_up_question"))
    .filter(Boolean);
}

function classifyClarificationQuestion(question = "") {
  const text = question.toLowerCase();
  if (/(what kind of sound|what specific sound|grinding|squealing|clicking|knocking|humming|rattling)/.test(text)) return "sound_type";
  if (/(when exactly|when do you hear|while braking|while breaking|when braking|when breaking|turning|accelerating|driving|specific speeds|engine first starts|idling)/.test(text)) return "timing";
  if (/(vibration|pedal|steering wheel|pulling|soft|spongy|brake force|stopping distance)/.test(text)) return "brake_symptoms";
  if (/(front|rear|engine bay|specific area|which side|left|right)/.test(text)) return "location";
  return "other";
}

function extractFactsFromMessages(messages: any[]) {
  const facts: Record<string, string | null> = {
    soundType: null,
    timing: null,
    location: null,
    vibration: null,
    pulling: null,
    softPedal: null,
  };

  const userTexts = messages
    .filter((message) => message?.role === "user")
    .map((message) => normalizeUserText(contentToText(message.content)))
    .filter(Boolean);

  for (const entry of userTexts) {
    const text = entry.toLowerCase();

    if (/(screech|screeching)/.test(text)) facts.soundType = "screeching";
    if (/(squeal|squeeling|squealing)/.test(text)) facts.soundType = "squealing";
    if (/(grind|grinding)/.test(text)) facts.soundType = "grinding";
    if (/(knock|knocking)/.test(text)) facts.soundType = "knocking";
    if (/(click|clicking)/.test(text)) facts.soundType = "clicking";
    if (/(hum|humming)/.test(text)) facts.soundType = "humming";
    if (/(rattle|rattling)/.test(text)) facts.soundType = "rattling";

    if (/(while braking|while breaking|when braking|when breaking|press the brakes|pressing the brakes|hit the brakes|when i brake)/.test(text)) facts.timing = "while braking";
    else if (/(while turning|when turning|turn the steering wheel|when i turn)/.test(text)) facts.timing = "while turning";
    else if (/(while accelerating|when accelerating|when i accelerate)/.test(text)) facts.timing = "while accelerating";
    else if (/(engine first starts|when starting|on startup|when the engine starts)/.test(text)) facts.timing = "on engine start";
    else if (/(while driving|constantly while driving|all the time|constant)/.test(text)) facts.timing = "while driving";
    else if (/(idling|when idling)/.test(text)) facts.timing = "while idling";

    if (/(front|from the front|front end)/.test(text)) facts.location = "front";
    else if (/(rear|back of the car|from the back)/.test(text)) facts.location = "rear";
    else if (/(engine bay|under the hood|bonnet area)/.test(text)) facts.location = "engine bay";

    if (/(nothing physical|nothing noticeable|nothing as far as i've noticed|no physical symptoms|don['']?t feel anything|do not feel anything)/.test(text)) {
      facts.vibration = "no";
      facts.pulling = "no";
      facts.softPedal = "no";
    }

    if (/(no vibration|without vibration|not vibrating)/.test(text)) facts.vibration = "no";
    else if (/(vibration|vibrating|shaking)/.test(text)) facts.vibration = "yes";

    if (/(not pulling|no pulling|doesn['']?t pull)/.test(text)) facts.pulling = "no";
    else if (/(pulling to one side|pulls to one side|pulling)/.test(text)) facts.pulling = "yes";

    if (/(pedal feels normal|not soft|not spongy|nothing soft|no soft pedal|no spongy pedal)/.test(text)) facts.softPedal = "no";
    else if (/(soft pedal|spongy pedal|pedal feels soft|pedal feels spongy)/.test(text)) facts.softPedal = "yes";
  }

  return facts;
}

function buildInvestigationMemory(messages: any[]) {
  const facts = extractFactsFromMessages(messages);
  const askedCategories = Array.from(
    new Set(extractClarificationQuestions(messages).map((item: any) => classifyClarificationQuestion(item.question))),
  ).filter(Boolean);

  const knownFacts = [
    facts.soundType ? `- Sound type: ${facts.soundType}` : "- Sound type: unresolved",
    facts.timing ? `- Timing: ${facts.timing}` : "- Timing: unresolved",
    facts.location ? `- Location: ${facts.location}` : "- Location: unresolved",
    facts.vibration ? `- Vibration reported: ${facts.vibration}` : "- Vibration reported: unresolved",
    facts.pulling ? `- Pulling reported: ${facts.pulling}` : "- Pulling reported: unresolved",
    facts.softPedal ? `- Soft or spongy pedal reported: ${facts.softPedal}` : "- Soft or spongy pedal reported: unresolved",
  ];

  const notes = [];
  if (askedCategories.length > 0) notes.push(`Clarification categories already asked: ${askedCategories.join(", ")}`);
  if ((facts.soundType === "squealing" || facts.soundType === "screeching" || facts.soundType === "grinding") && facts.timing === "while braking" && facts.vibration === "no" && facts.pulling === "no" && facts.softPedal === "no") {
    notes.push("Brake-noise pattern is already established. Do not ask another generic sound/timing/brake-symptom question. Ask only one new unresolved detail or request a brake/wheel photo.");
  }
  if (facts.soundType === "grinding" && facts.timing === "while braking") {
    notes.push("Grinding while braking is already established and is potentially metal-on-metal brake wear. Do not ask another generic sound, timing, vibration, pulling, or pedal-feel question. Request one close-up brake/wheel photo next unless a final safety brief is already justified.");
  }

  return [
    "KNOWN FACTS:",
    ...knownFacts,
    "",
    "ANTI-REPEAT NOTES:",
    ...(notes.length > 0 ? notes.map((note) => `- ${note}`) : ["- No special anti-repeat notes yet."]),
  ].join("\n");
}

function isBrakeGrindingEstablished(messages: any[]) {
  const facts = extractFactsFromMessages(messages);
  return facts.soundType === "grinding" && facts.timing === "while braking";
}

function buildBrakeGrindingEvidenceRequest() {
  const guidance = {
    headline: "Photograph the brake area",
    targetView: "wheel_closeup",
    hotspotId: "front_left_brake",
    rotationY: 45,
    tiltX: 0,
    focusArea: "brake rotor",
    captureHint: "Close view through wheel spokes",
    animation: "pulse-wheel",
  };

  return {
    instruction:
      "Park safely on level ground, turn the engine off, and take one clear close-up photo through the wheel spokes of the brake rotor and caliper on the wheel where the grinding is loudest. If you cannot tell which side, use a front wheel and fill the frame with the rotor/caliper area.",
    why:
      "Grinding only while braking often means metal-on-metal pad or rotor wear, and this photo can show pad thickness, rotor scoring, or brake hardware damage.",
    guidance,
  };
}

function shouldReplaceBrakeGrindingQuestion(messages: any[], followUpQuestion: any) {
  if (!followUpQuestion?.question || !isBrakeGrindingEstablished(messages)) return false;
  return ["sound_type", "timing", "brake_symptoms"].includes(classifyClarificationQuestion(followUpQuestion.question));
}

function emitPhase(sseEmitter: SseEmitter, phase: string) {
  if (!phase || sseEmitter.emittedPhases.has(phase)) return;
  sseEmitter.emittedPhases.add(phase);
  sseEmitter.send("phase", { phase, label: PHASE_LABELS[phase] || phase });
}

function emitPhaseUpdate(sseEmitter: SseEmitter, update: any) {
  if (!update || !update.phase) return;
  emitPhase(sseEmitter, update.phase);
  sseEmitter.send("phase_update", {
    phase: update.phase,
    label: PHASE_LABELS[update.phase] || update.phase,
    status: update.status || "",
    progress: typeof update.progress === "number" ? update.progress : null,
  });
}

function emitTaggedJson(snapshot: string, tagName: string, state: { count: number }, onValue: (value: any) => void) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "gi");
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

function summarizeSessionPatch(event: string, data: any) {
  switch (event) {
    case "phase":
      return { currentPhase: data.phase || null };
    case "phase_update":
      return {
        status: "streaming",
        currentPhase: data.phase || null,
        phaseStatus: data.status || "",
        phaseProgress: typeof data.progress === "number" ? data.progress : null,
      };
    case "budget":
      return { budget: data || null };
    case "camera_guidance":
      return { modelGuidance: data || null };
    case "evidence_request":
      return { status: "awaiting_evidence", evidenceRequest: data || null, followUpQuestion: null };
    case "follow_up_question":
      return { status: "awaiting_clarification", followUpQuestion: data || null, evidenceRequest: null };
    case "brief":
      return { status: "complete", brief: data || null, evidenceRequest: null, followUpQuestion: null, phaseProgress: 1 };
    case "done":
      return data?.error ? { status: "error", error: data.error } : {};
    default:
      return {};
  }
}

function updateBudgetFromUsage(usage: any, totalTokensUsed: number, sseEmitter: SseEmitter) {
  const inputTokens = usage?.input_tokens || 0;
  const outputTokens = usage?.output_tokens || 0;
  const nextTotal = totalTokensUsed + inputTokens + outputTokens;
  sseEmitter.send("budget", {
    used: nextTotal,
    total: BUDGET,
    remaining: Math.max(0, BUDGET - nextTotal),
  });
  return nextTotal;
}

async function requestClaude(messages: any[], sseEmitter: SseEmitter) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: INVESTIGATION_MODEL,
      max_tokens: 4096,
      stream: true,
      system: `${INVESTIGATION_SYSTEM_PROMPT}\n\nCURRENT INVESTIGATION MEMORY:\n${buildInvestigationMemory(messages)}`,
      messages,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
  }

  const parserState = {
    fullText: "",
    phaseState: { count: 0 },
    guidanceState: { count: 0 },
  };
  let usage: any = {};
  let buffer = "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const payload = dataLine.slice(6);
      if (payload === "[DONE]") continue;

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      if (parsed.type === "message_start") {
        usage = { ...usage, ...(parsed.message?.usage || {}) };
      }
      if (parsed.type === "message_delta") {
        usage = { ...usage, ...(parsed.usage || {}) };
      }
      if (parsed.type === "content_block_delta") {
        const delta = parsed.delta || {};
        if (delta.type === "text_delta" && delta.text) {
          parserState.fullText += delta.text;
          emitTaggedJson(parserState.fullText, "phase_update", parserState.phaseState, (update) => {
            emitPhaseUpdate(sseEmitter, update);
          });
          emitTaggedJson(parserState.fullText, "camera_guidance", parserState.guidanceState, (guidance) => {
            sseEmitter.send("camera_guidance", guidance);
          });
        }
        if ((delta.type === "thinking_delta" || delta.type === "signature_delta") && delta.thinking) {
          sseEmitter.send("thinking", { text: delta.thinking });
        }
      }
    }
  }

  return { fullResponse: parserState.fullText, usage };
}

async function answerFollowUp(ctx: any, user: any, vehicleId: string, promptText: string, chatMessages: any[] = [], brief: any = null) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const history = await ctx.runQuery(internal.state.getCaseFile, { userId: user.id, vehicleId });
  const transcript = chatMessages
    .filter((message) => message && (message.type === "user" || message.type === "agent" || message.type === "system"))
    .map((message) => {
      const speaker = message.type === "user" ? "User" : "Assistant";
      return `${speaker}: ${message.text || message.content || ""}`;
    })
    .filter(Boolean)
    .slice(-12)
    .join("\n");

  const contextParts = [
    `Vehicle history:\n${JSON.stringify(history, null, 2)}`,
    brief ? `Diagnostic brief:\n${JSON.stringify(brief, null, 2)}` : "",
    transcript ? `Recent chat transcript:\n${transcript}` : "",
    `User follow-up:\n${promptText}`,
  ].filter(Boolean);

  const requestBody = {
    max_tokens: 500,
    system: FOLLOW_UP_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: contextParts.join("\n\n") }],
      },
    ],
  };

  const sendFollowUp = (model: string) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      ...requestBody,
    }),
  });

  let response = await sendFollowUp(FOLLOW_UP_MODEL);

  if (!response.ok && FOLLOW_UP_MODEL !== INVESTIGATION_MODEL && response.status === 404) {
    response = await sendFollowUp(INVESTIGATION_MODEL);
  }

  if (!response.ok) {
    throw new Error(`Anthropic follow-up failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return (data.content || [])
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("")
    .trim();
}

async function storeSession(ctx: any, user: any, sessionId: string, vehicleId: string, data: any) {
  await ctx.runMutation(internal.state.saveSession, { sessionId, patch: { userId: user.id, vehicleId, ...data } });
}

async function getSessionMessages(ctx: any, user: any, session: any) {
  if (Array.isArray(session?.messages)) return session.messages;
  const history = await ctx.runQuery(internal.state.getCaseFile, { userId: user.id, vehicleId: session.vehicleId });
  const baseMessages: any[] = [
    {
      role: "user",
      content: [{ type: "text", text: `Vehicle history:\n${JSON.stringify(history, null, 2)}` }],
    },
  ];

  if (session.followUpQuestion) {
    baseMessages.push({
      role: "assistant",
      content: `\`\`\`follow_up_question\n${JSON.stringify(session.followUpQuestion, null, 2)}\n\`\`\``,
    });
  } else if (session.evidenceRequest) {
    baseMessages.push({
      role: "assistant",
      content: `\`\`\`evidence_request\n${JSON.stringify(session.evidenceRequest, null, 2)}\n\`\`\``,
    });
  } else if (typeof session.fullResponse === "string" && session.fullResponse.trim()) {
    baseMessages.push({ role: "assistant", content: session.fullResponse });
  }

  return baseMessages;
}

async function finalizeBrief(ctx: any, user: any, vehicleId: string, brief: any, sseEmitter: SseEmitter) {
  emitPhase(sseEmitter, "VERIFICATION");
  emitPhase(sseEmitter, "BRIEF");
  sseEmitter.send("brief", brief);

  if (brief.annotations) {
    for (const ann of brief.annotations) sseEmitter.send("annotation", ann);
  }

  if (brief.case_note) {
    await ctx.runMutation(internal.state.appendCaseNote, { userId: user.id, vehicleId, note: brief.case_note });
    sseEmitter.send("case_note", { line: brief.case_note });
  }

  sseEmitter.send("done", {});
  sseEmitter.end();
}

async function runInvestigation(ctx: any, user: any, vehicleId: string, sessionId: string, symptomText: string, image: any, sseEmitter: SseEmitter) {
  emitPhaseUpdate(sseEmitter, {
    phase: "INTAKE",
    status: "Reviewing the symptom and initial evidence.",
    progress: 0.08,
  });

  const history = await ctx.runQuery(internal.state.getCaseFile, { userId: user.id, vehicleId });
  const content: any[] = [
    { type: "text", text: `Vehicle history:\n${JSON.stringify(history, null, 2)}` },
    { type: "text", text: `Symptom described: ${symptomText}` },
  ];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    });
  }

  const messages = [{ role: "user", content }];
  await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed: 0, fullResponse: "" });

  const { fullResponse, usage } = await requestClaude(messages, sseEmitter);
  const totalTokensUsed = updateBudgetFromUsage(usage, 0, sseEmitter);

  const evidenceRequest = parseJsonBlock(fullResponse, "evidence_request");
  if (evidenceRequest) {
    emitPhase(sseEmitter, "EVIDENCE_GAP");
    await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
    sseEmitter.send("evidence_request", evidenceRequest);
    sseEmitter.end();
    return;
  }

  const followUpQuestion = parseJsonBlock(fullResponse, "follow_up_question");
  if (followUpQuestion) {
    emitPhase(sseEmitter, "EVIDENCE_GAP");
    if (shouldReplaceBrakeGrindingQuestion(messages, followUpQuestion)) {
      const replacement = buildBrakeGrindingEvidenceRequest();
      await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.send("camera_guidance", replacement.guidance);
      sseEmitter.send("evidence_request", replacement);
      sseEmitter.end();
      return;
    }
    await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
    sseEmitter.send("follow_up_question", followUpQuestion);
    sseEmitter.end();
    return;
  }

  const brief = parseJsonBlock(fullResponse, "diagnostic_brief");
  if (brief) {
    await finalizeBrief(ctx, user, vehicleId, brief, sseEmitter);
    return;
  }

  sseEmitter.send("done", { error: "No diagnostic brief or evidence request found in the Claude response." });
  sseEmitter.end();
}

async function resumeInvestigation(ctx: any, user: any, sessionId: string, image: any, sseEmitter: SseEmitter) {
  const session = await ctx.runQuery(internal.state.loadSession, { sessionId });
  if (!session || session.userId !== user.id) {
    sseEmitter.send("done", { error: "Session not found" });
    sseEmitter.end();
    return;
  }

  emitPhaseUpdate(sseEmitter, {
    phase: "ANALYSIS",
    status: "Analyzing the newly requested photo.",
    progress: 0.56,
  });

  const hasStoredMessages = Array.isArray(session.messages);
  const messages = await getSessionMessages(ctx, user, session);
  const fullResponse = typeof session.fullResponse === "string" ? session.fullResponse : "";
  const resumedMessages = [
    ...messages,
    ...(hasStoredMessages && fullResponse.trim() ? [{ role: "assistant", content: fullResponse }] : []),
    {
      role: "user",
      content: [
        { type: "text", text: "Here is the photo you requested." },
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
      ],
    },
  ];

  const { fullResponse: newResponse, usage } = await requestClaude(resumedMessages, sseEmitter);
  const totalTokensUsed = updateBudgetFromUsage(usage, session.totalTokensUsed || 0, sseEmitter);
  await handleContinuationOutput(ctx, user, sessionId, session.vehicleId, resumedMessages, totalTokensUsed, newResponse, sseEmitter);
}

async function resumeInvestigationWithText(ctx: any, user: any, sessionId: string, answerText: string, sseEmitter: SseEmitter) {
  const session = await ctx.runQuery(internal.state.loadSession, { sessionId });
  if (!session || session.userId !== user.id) {
    sseEmitter.send("done", { error: "Session not found" });
    sseEmitter.end();
    return;
  }

  emitPhaseUpdate(sseEmitter, {
    phase: "ANALYSIS",
    status: "Reviewing the added symptom details.",
    progress: 0.34,
  });

  const hasStoredMessages = Array.isArray(session.messages);
  const messages = await getSessionMessages(ctx, user, session);
  const fullResponse = typeof session.fullResponse === "string" ? session.fullResponse : "";
  const resumedMessages = [
    ...messages,
    ...(hasStoredMessages && fullResponse.trim() ? [{ role: "assistant", content: fullResponse }] : []),
    { role: "user", content: [{ type: "text", text: answerText }] },
  ];

  const { fullResponse: newResponse, usage } = await requestClaude(resumedMessages, sseEmitter);
  const totalTokensUsed = updateBudgetFromUsage(usage, session.totalTokensUsed || 0, sseEmitter);
  await handleContinuationOutput(ctx, user, sessionId, session.vehicleId, resumedMessages, totalTokensUsed, newResponse, sseEmitter);
}

async function handleContinuationOutput(
  ctx: any,
  user: any,
  sessionId: string,
  vehicleId: string,
  messages: any[],
  totalTokensUsed: number,
  fullResponse: string,
  sseEmitter: SseEmitter,
) {
  const evidenceRequest = parseJsonBlock(fullResponse, "evidence_request");
  if (evidenceRequest) {
    emitPhase(sseEmitter, "EVIDENCE_GAP");
    await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
    sseEmitter.send("evidence_request", evidenceRequest);
    sseEmitter.end();
    return;
  }

  const followUpQuestion = parseJsonBlock(fullResponse, "follow_up_question");
  if (followUpQuestion) {
    emitPhase(sseEmitter, "EVIDENCE_GAP");
    if (shouldReplaceBrakeGrindingQuestion(messages, followUpQuestion)) {
      const replacement = buildBrakeGrindingEvidenceRequest();
      await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
      sseEmitter.send("camera_guidance", replacement.guidance);
      sseEmitter.send("evidence_request", replacement);
      sseEmitter.end();
      return;
    }
    await storeSession(ctx, user, sessionId, vehicleId, { messages, totalTokensUsed, fullResponse });
    sseEmitter.send("follow_up_question", followUpQuestion);
    sseEmitter.end();
    return;
  }

  const brief = parseJsonBlock(fullResponse, "diagnostic_brief");
  if (brief) {
    await finalizeBrief(ctx, user, vehicleId, brief, sseEmitter);
    return;
  }

  sseEmitter.send("done", { error: "No diagnostic brief, clarification question, or evidence request found in the Claude response." });
  sseEmitter.end();
}

function createSseResponse(request: Request, sessionId: string | null, ctx: any, runner: (sseEmitter: SseEmitter) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const emitter: SseEmitter = {
        emittedPhases: new Set(),
        send(event, data) {
          if (closed) return;
          if (sessionId) {
            ctx.runMutation(internal.state.appendSessionEvent, {
              sessionId,
              event,
              data,
              patch: summarizeSessionPatch(event, data),
            }).catch((error: unknown) => console.error("Failed to persist SSE event", error));
          }
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        },
        end() {
          if (closed) return;
          closed = true;
          controller.close();
        },
      };

      try {
        await runner(emitter);
      } catch (error: any) {
        emitter.send("done", { error: error?.message || "Request failed." });
        emitter.end();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders(request, "POST,OPTIONS"),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

const http = httpRouter();

http.route({
  path: "/api/auth/register",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "auth-register", 8, DEFAULT_RATE_WINDOW_MS);
    if (limited) return limited;

    const { username = "", password = "" } = await request.json();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password);
    const validationError = validateCredentials(cleanUsername, cleanPassword);
    if (validationError) return jsonResponse(request, { error: validationError }, 400);

    const usernameLower = normalizeUsername(cleanUsername);
    const existing = await ctx.runQuery(internal.state.getUserByUsernameLower, { usernameLower });
    if (existing) return jsonResponse(request, { error: "Username is already taken." }, 409);

    const salt = randomToken(24);
    const passwordHash = await hashPassword(cleanPassword, salt);
    const { userId } = await ctx.runMutation(internal.state.createUser, {
      username: cleanUsername,
      usernameLower,
      passwordHash,
      salt,
      iterations: PASSWORD_ITERATIONS,
    });

    const token = randomToken(32);
    await ctx.runMutation(internal.state.createAuthSession, {
      userId,
      tokenHash: await tokenHash(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return jsonResponse(request, {
      token,
      user: { id: userId, username: cleanUsername },
    });
  }),
});

http.route({
  path: "/api/auth/login",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "auth-login", 10, DEFAULT_RATE_WINDOW_MS);
    if (limited) return limited;

    const { username = "", password = "" } = await request.json();
    const usernameLower = normalizeUsername(String(username));
    const user = await ctx.runQuery(internal.state.getUserByUsernameLower, { usernameLower });

    if (!user) return jsonResponse(request, { error: "Invalid username or password." }, 401);

    const candidateHash = await hashPassword(String(password), user.salt, user.iterations);
    if (candidateHash !== user.passwordHash) {
      return jsonResponse(request, { error: "Invalid username or password." }, 401);
    }

    const token = randomToken(32);
    await ctx.runMutation(internal.state.createAuthSession, {
      userId: user._id,
      tokenHash: await tokenHash(token),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return jsonResponse(request, {
      token,
      user: { id: user._id, username: user.username },
    });
  }),
});

http.route({
  path: "/api/auth/me",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "GET,OPTIONS")),
});

http.route({
  path: "/api/auth/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { user: null }, 401);
    return jsonResponse(request, { user });
  }),
});

http.route({
  path: "/api/auth/logout",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/auth/logout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const token = bearerToken(request);
    if (token) {
      await ctx.runMutation(internal.state.deleteAuthSession, { tokenHash: await tokenHash(token) });
    }
    return jsonResponse(request, { success: true });
  }),
});

http.route({
  path: "/api/cars",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "GET,POST,OPTIONS")),
});

http.route({
  path: "/api/cars",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);
    const cars = await ctx.runQuery(internal.state.listCars, { userId: user.id });
    return jsonResponse(request, { cars });
  }),
});

http.route({
  path: "/api/cars",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return jsonResponse(request, { error: "Car name is required." }, 400);

    const car = await ctx.runMutation(internal.state.createCar, {
      userId: user.id,
      publicId: `car_${randomToken(12)}`,
      name: name.slice(0, 80),
      label: String(body.label || "Vehicle").slice(0, 80),
      type: String(body.type || "sedan").slice(0, 40),
      color: String(body.color || "#3b82f6").slice(0, 24),
      modelAsset: typeof body.modelAsset === "string" ? body.modelAsset.slice(0, 200) : undefined,
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 8).map((item: unknown) => String(item)) : [],
    });

    return jsonResponse(request, { car }, 201);
  }),
});

http.route({
  pathPrefix: "/api/cars/",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "PATCH,DELETE,OPTIONS")),
});

http.route({
  pathPrefix: "/api/cars/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const publicId = pathSuffix(request, "/api/cars/");
    const body = await request.json();
    const updates = {
      name: typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined,
      label: typeof body.label === "string" ? body.label.slice(0, 80) : undefined,
      type: typeof body.type === "string" ? body.type.slice(0, 40) : undefined,
      color: typeof body.color === "string" ? body.color.slice(0, 24) : undefined,
      modelAsset: typeof body.modelAsset === "string" ? body.modelAsset.slice(0, 200) : undefined,
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 8).map((item: unknown) => String(item)) : undefined,
    };

    await ctx.runMutation(internal.state.updateCar, { userId: user.id, publicId, updates });
    return jsonResponse(request, { success: true });
  }),
});

http.route({
  pathPrefix: "/api/cars/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const publicId = pathSuffix(request, "/api/cars/");
    await ctx.runMutation(internal.state.deleteCar, { userId: user.id, publicId });
    await ctx.runMutation(internal.state.clearCaseFile, { userId: user.id, vehicleId: publicId });
    await ctx.runMutation(internal.state.clearVehicleSessions, { userId: user.id, vehicleId: publicId });
    return jsonResponse(request, { success: true });
  }),
});

http.route({
  path: "/api/investigate",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/investigate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "investigate", AI_RATE_LIMIT);
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const formData = await request.formData();
    const symptomText = String(formData.get("symptomText") || "");
    const vehicleId = String(formData.get("vehicleId") || "");
    const file = formData.get("image");
    const image = await fileToImage(file instanceof File ? file : null);
    const sessionId = randomSessionId();

    if (!vehicleId || !symptomText) {
      return createSseResponse(request, null, ctx, async (sseEmitter) => {
        sseEmitter.send("done", { error: "vehicleId and symptomText are required." });
        sseEmitter.end();
      });
    }
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);

    await ctx.runMutation(internal.state.saveSession, {
      sessionId,
      patch: {
        sessionId,
        userId: user.id,
        vehicleId,
        status: "streaming",
        currentPhase: "INTAKE",
        phaseStatus: "Preparing the investigation.",
        phaseProgress: 0.04,
        modelGuidance: null,
        evidenceRequest: null,
        followUpQuestion: null,
        brief: null,
        annotations: [],
        budget: { used: 0, total: BUDGET, remaining: BUDGET },
        error: null,
      },
    });

    return createSseResponse(request, sessionId, ctx, async (sseEmitter) => {
      sseEmitter.send("session_start", { sessionId });
      await runInvestigation(ctx, user, vehicleId, sessionId, symptomText, image, sseEmitter);
    });
  }),
});

http.route({
  path: "/api/submit-evidence",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/submit-evidence",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "submit-evidence", AI_RATE_LIMIT);
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const formData = await request.formData();
    const sessionId = String(formData.get("sessionId") || "");
    const vehicleId = String(formData.get("vehicleId") || "");
    const file = formData.get("image");
    const image = await fileToImage(file instanceof File ? file : null);

    if (!sessionId || !image) {
      return createSseResponse(request, null, ctx, async (sseEmitter) => {
        sseEmitter.send("done", { error: "sessionId and image are required." });
        sseEmitter.end();
      });
    }

    const existingSession = await ctx.runQuery(internal.state.loadSession, { sessionId });
    if (!existingSession || existingSession.userId !== user.id) {
      return createSseResponse(request, null, ctx, async (sseEmitter) => {
        sseEmitter.send("done", { error: "Session not found." });
        sseEmitter.end();
      });
    }

    await ctx.runMutation(internal.state.saveSession, {
      sessionId,
      patch: {
        userId: user.id,
        vehicleId: vehicleId || existingSession.vehicleId || null,
        status: "streaming",
        phaseStatus: "Reviewing the requested evidence.",
        phaseProgress: 0.52,
        evidenceRequest: null,
        followUpQuestion: null,
        error: null,
      },
    });

    return createSseResponse(request, sessionId, ctx, async (sseEmitter) => {
      await resumeInvestigation(ctx, user, sessionId, image, sseEmitter);
    });
  }),
});

http.route({
  path: "/api/submit-clarification",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/submit-clarification",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "submit-clarification", AI_RATE_LIMIT);
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const { sessionId, answerText } = await request.json();
    if (!sessionId || !answerText) {
      return createSseResponse(request, null, ctx, async (sseEmitter) => {
        sseEmitter.send("done", { error: "sessionId and answerText are required." });
        sseEmitter.end();
      });
    }

    const existingSession = await ctx.runQuery(internal.state.loadSession, { sessionId });
    if (!existingSession || existingSession.userId !== user.id) {
      return createSseResponse(request, null, ctx, async (sseEmitter) => {
        sseEmitter.send("done", { error: "Session not found." });
        sseEmitter.end();
      });
    }

    await ctx.runMutation(internal.state.saveSession, {
      sessionId,
      patch: {
        userId: user.id,
        vehicleId: existingSession.vehicleId || null,
        status: "streaming",
        phaseStatus: "Reviewing the clarification.",
        phaseProgress: 0.32,
        followUpQuestion: null,
        evidenceRequest: null,
        error: null,
      },
    });

    return createSseResponse(request, sessionId, ctx, async (sseEmitter) => {
      await resumeInvestigationWithText(ctx, user, sessionId, String(answerText), sseEmitter);
    });
  }),
});

http.route({
  path: "/api/chat-followup",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "POST,OPTIONS")),
});

http.route({
  path: "/api/chat-followup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "chat-followup", AI_RATE_LIMIT);
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const { vehicleId, promptText, chatMessages, brief } = await request.json();
    if (!vehicleId || !promptText || typeof promptText !== "string") {
      return jsonResponse(request, { error: "vehicleId and promptText are required." }, 400);
    }
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);

    try {
      const reply = await answerFollowUp(ctx, user, vehicleId, promptText, Array.isArray(chatMessages) ? chatMessages : [], brief || null);
      return jsonResponse(request, { reply });
    } catch (error: any) {
      console.error("Follow-up chat error:", error);
      return jsonResponse(request, { error: error?.message || "Follow-up failed." }, 500);
    }
  }),
});

http.route({
  pathPrefix: "/api/case-notes/",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "GET,DELETE,OPTIONS")),
});

http.route({
  pathPrefix: "/api/case-notes/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "case-notes");
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const vehicleId = pathSuffix(request, "/api/case-notes/");
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);
    const history = await ctx.runQuery(internal.state.getCaseFile, { userId: user.id, vehicleId });
    return jsonResponse(request, history);
  }),
});

http.route({
  pathPrefix: "/api/case-notes/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "clear-case-notes");
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const vehicleId = pathSuffix(request, "/api/case-notes/");
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);
    await ctx.runMutation(internal.state.clearCaseFile, { userId: user.id, vehicleId });
    await ctx.runMutation(internal.state.clearVehicleSessions, { userId: user.id, vehicleId });
    return jsonResponse(request, { success: true });
  }),
});

http.route({
  pathPrefix: "/api/investigation-state/",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "GET,DELETE,OPTIONS")),
});

http.route({
  pathPrefix: "/api/investigation-state/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "investigation-state");
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const vehicleId = pathSuffix(request, "/api/investigation-state/");
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);
    const url = new URL(request.url);
    const since = Number.parseInt(url.searchParams.get("since") || "", 10);
    const session = await ctx.runQuery(internal.state.findLatestVehicleSession, { userId: user.id, vehicleId });

    if (!session) return jsonResponse(request, { session: null, events: [], cursor: 0 });

    const events = Number.isFinite(since)
      ? (Array.isArray(session.events) ? session.events.filter((event: any) => event.index >= since) : [])
      : [];

    return jsonResponse(request, {
      session: {
        sessionId: session.sessionId,
        vehicleId: session.vehicleId,
        status: session.status || "idle",
        currentPhase: session.currentPhase || null,
        phaseStatus: session.phaseStatus || "",
        phaseProgress: typeof session.phaseProgress === "number" ? session.phaseProgress : null,
        modelGuidance: session.modelGuidance || null,
        evidenceRequest: session.evidenceRequest || null,
        followUpQuestion: session.followUpQuestion || null,
        brief: session.brief || null,
        annotations: Array.isArray(session.annotations) ? session.annotations : [],
        budget: session.budget || null,
        error: session.error || null,
        updatedAt: session.updatedAt || null,
        eventCount: typeof session.eventCount === "number" ? session.eventCount : 0,
      },
      events,
      cursor: typeof session.eventCount === "number" ? session.eventCount : 0,
    });
  }),
});

http.route({
  pathPrefix: "/api/investigation-state/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "clear-investigation-state");
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    const vehicleId = pathSuffix(request, "/api/investigation-state/");
    const car = await requireOwnedCar(ctx, user, vehicleId);
    if (!car) return jsonResponse(request, { error: "Car not found." }, 404);
    await ctx.runMutation(internal.state.clearVehicleSessions, { userId: user.id, vehicleId });
    return jsonResponse(request, { success: true });
  }),
});

http.route({
  path: "/api/garages",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => optionsResponse(request, "GET,OPTIONS")),
});

http.route({
  path: "/api/garages",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const limited = await enforceRateLimit(ctx, request, "garages");
    if (limited) return limited;
    const user = await requireUser(ctx, request);
    if (!user) return jsonResponse(request, { error: "Unauthorized." }, 401);

    return jsonResponse(request, [
      {
        id: "g1",
        name: "Al Futtaim Auto Centre",
        distance_km: 1.2,
        rating: 4.8,
        slots: ["Today 4:30 PM", "Tomorrow 9:00 AM", "Tomorrow 2:00 PM"],
      },
      {
        id: "g2",
        name: "Emirates Motor Company",
        distance_km: 2.7,
        rating: 4.6,
        slots: ["Tomorrow 11:00 AM", "Thu 9:00 AM"],
      },
      {
        id: "g3",
        name: "Quick Lube & Service",
        distance_km: 0.8,
        rating: 4.3,
        slots: ["Today 5:00 PM", "Tomorrow 8:30 AM"],
      },
    ]);
  }),
});

export default http;
