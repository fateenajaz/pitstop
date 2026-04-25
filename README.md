# Pit Stop

**Autonomous vehicle diagnostics powered by Claude Opus 4.7**

Pit Stop turns a vague driver complaint into a structured diagnostic investigation. A user can say something as simple as "I hear a grinding sound when braking," and the app will clarify what matters, request the exact photo it needs, guide the user with a 3D vehicle hotspot, inspect visual evidence, and produce a garage-ready diagnostic brief.

This is not a themed chat UI. Pit Stop is an Opus 4.7 investigation loop wrapped in a practical product experience.

## Why Opus 4.7 Matters

Vehicle diagnosis is messy. Drivers describe symptoms imprecisely, photos are often incomplete, and a premature answer can be actively dangerous. Pit Stop uses Opus 4.7 where a smaller linear assistant breaks down: staying oriented across multiple turns, deciding what evidence is missing, rejecting insufficient evidence, and producing a structured conclusion only after it can defend the diagnosis.

Opus 4.7 is used as the diagnostic engine for:

| Capability | Pit Stop Behavior | Why It Wins |
| --- | --- | --- |
| Long-horizon investigation | Maintains known facts, prior questions, evidence requests, and final diagnosis state across turns | The agent stops looping and behaves like an investigator, not a chatbot |
| Multimodal reasoning | Reads symptom text and uploaded vehicle photos in the same diagnostic context | The diagnosis is grounded in both driver-reported symptoms and visual evidence |
| Evidence planning | Asks for one high-value photo or clarification at a time | The user is never buried in a checklist; every request has a reason |
| Structured output discipline | Emits machine-readable events, evidence requests, camera guidance, annotations, and final briefs | The frontend can render a real workflow instead of parsing prose |
| Verification mindset | Challenges the top diagnosis before producing the brief | The final answer is treated as a safety-critical artifact |

## The Product

Pit Stop gives drivers a simple flow:

1. Add a vehicle to the garage.
2. Describe the issue in plain language.
3. Answer targeted clarifying questions if needed.
4. Follow the 3D vehicle guidance to capture the requested evidence.
5. Receive a diagnostic brief with urgency, explanation, likely fault, cost band, and next action.
6. Ask follow-up questions about safety, repair options, or what to tell the garage.

The app is optimized for real driver behavior: vague symptoms, partial information, bad first photos, and the need for clear next steps.

## Demo Flow

Try this path:

```text
User: i hear a screeching sound while driving
Pit Stop: Does it happen when braking or even when not braking?
User: yes it's while braking
Pit Stop: What type of sound is it?
User: it's a grinding sound
Pit Stop: Requests a close-up brake rotor/caliper photo and highlights the wheel/brake hotspot
```

After the image is reviewed, Pit Stop can produce a brief such as:

- Primary fault: worn brake pads / rotor scoring
- Urgency: high or critical
- Explanation: grinding while braking can indicate metal-on-metal contact
- Recommended action: stop driving except for immediate repair or arrange a tow
- Case note: saved to the vehicle history

## Core Features

- **Autonomous diagnostic loop**: symptom intake, clarification, evidence request, analysis, verification, and final brief are managed by the model.
- **3D evidence guidance**: the frontend rotates and focuses a vehicle model using model-emitted `targetView` and `hotspotId` values.
- **Detailed hotspot map**: tires, brakes, suspension corners, engine-bay parts, bumpers, doors, panels, windshield, roof, exhaust, trunk, and underbody all have named guidance targets.
- **Evidence rejection**: if a submitted photo is blurry, too dark, obstructed, or misses the requested area, the agent asks for a better shot instead of guessing.
- **Persistent sessions**: active investigations survive refreshes and can be restored from backend session files.
- **Vehicle history**: diagnostic case notes are saved per car.
- **Follow-up assistant**: after a brief, users can ask practical questions like "Is it safe to drive?" or "What should I ask the garage?"

## Architecture

```text
frontend/
  React + Vite
  Three.js vehicle model
  Chat, evidence request, diagnostic brief, garage UI

backend/
  Express API
  Anthropic SDK
  SSE investigation stream
  File-backed vehicle case notes and investigation sessions

Claude Opus 4.7
  Diagnostic investigation
  Evidence planning
  Camera guidance JSON
  Diagnostic brief JSON
  Follow-up answers
```

### Event Flow

```text
POST /api/investigate
  -> session_start
  -> phase_update
  -> follow_up_question OR evidence_request OR brief

POST /api/submit-clarification
  -> continues the same investigation session

POST /api/submit-evidence
  -> sends requested image evidence back into the investigation

POST /api/chat-followup
  -> answers questions after a diagnostic brief exists
```

The model emits structured tags. The backend parses them and streams clean SSE events to the frontend.

## Hotspot Guidance

Pit Stop gives Opus 4.7 an explicit camera contract. The model can choose target views like:

```text
front, rear, left, right, top, underbody,
front_left, front_right, rear_left, rear_right, wheel_closeup
```

And specific hotspots like:

```text
front_left_tire, front_right_tire, rear_left_tire, rear_right_tire
front_left_brake, front_right_brake, rear_left_brake, rear_right_brake
front_left_suspension, front_right_suspension, rear_left_suspension, rear_right_suspension
engine_bay, battery_area, coolant_reservoir, oil_dipstick, engine_oil_cap, air_filter_box, radiator_front
front_bumper, rear_bumper, left_body_panel, right_body_panel, driver_door, passenger_door
windshield, roof_center, trunk_area, exhaust_rear
underbody_front, underbody_mid, underbody_rear
```

That lets the app translate model intent into visual camera guidance instead of generic "upload a photo" prompts.

## Tech Stack

- React 19
- Vite
- Three.js
- Framer Motion
- Express
- Anthropic SDK
- File-backed JSON persistence for hackathon-speed iteration

## Running Locally

### Prerequisites

- Node.js 20.19+
- An Anthropic API key

### Install

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Configure

Create `backend/.env`:

```bash
ANTHROPIC_API_KEY=your_key_here
PORT=3001
ANTHROPIC_INVESTIGATION_MODEL=<opus-4.7-model-id>
```

Optional frontend override in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3001
```

### Start

From the repo root:

```bash
npm run dev
```

The app starts:

- Backend: `http://localhost:3001`
- Frontend: Vite will print the local URL, usually `http://localhost:5173`

## Why This Is a Strong Hackathon Project

Pit Stop demonstrates Opus 4.7 as an agentic product primitive, not just a better response generator.

The model is responsible for judgment:

- What facts are already known?
- What question would reduce uncertainty?
- Is the evidence good enough?
- Which physical subsystem should the user photograph?
- What fault best explains the combined symptoms and image?
- What should the driver do next?

The application is responsible for productization:

- Clean mobile-first UX
- 3D visual guidance
- Persistent cases
- Streaming investigation state
- Structured diagnostic artifacts
- Follow-up repair guidance

That separation is the point: Opus 4.7 provides the expert investigation behavior, and Pit Stop turns it into something a normal driver could actually use.

## Safety Note

Pit Stop is a diagnostic assistant, not a replacement for a certified mechanic. For brake, steering, tire, overheating, smoke, fuel, or electrical burning issues, users should treat high-urgency recommendations conservatively and seek professional repair before driving.
