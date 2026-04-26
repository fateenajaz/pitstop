import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
dotenv.config({ path: path.join(repoRoot, "backend/.env") });

const outputPath = path.join(repoRoot, "video/src/generated/storyboard.json");
const voiceoverPath = path.join(repoRoot, "video/VOICEOVER.md");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_VIDEO_MODEL || process.env.ANTHROPIC_INVESTIGATION_MODEL || "claude-opus-4-1-20250805";

const prompt = `
Create production-ready timed narration and scene beats for a 2-minute vertical Remotion motion graphics video.

Product: Pit Stop, a mobile-first AI car diagnostic app.
URL to feature: https://pitstop.byfateen.com
Visual style: black and white, sleek Tesla-like product demo, premium motion graphics, no music, voiceover script only.
Canvas: 1080x1920, 30fps, 120 seconds.
Scenario:
- User logs in with username fateen and password demo123@.
- User adds a car.
- User reports: "i hear a screeching sound while driving".
- App asks clarifying questions.
- User clarifies it is grinding only while braking.
- App requests brake/wheel evidence using 3D hotspot guidance.
- First photo is a wheel photo that should be rejected because the rotor/caliper visibility is insufficient.
- Second photo is a close-up of a worn/scored brake rotor and should be accepted.
- App returns a high-urgency diagnostic brief: likely severe brake pad wear with rotor scoring, urgent brake inspection/service.
- Case note is saved and user can ask follow-up questions.

Return only valid JSON with this exact shape:
{
  "title": "string",
  "url": "string",
  "voiceover": [{"start": number, "end": number, "text": "string"}],
  "chapters": [{"start": number, "end": number, "label": "string"}],
  "captions": ["string"]
}

Constraints:
- The voiceover must cover exactly 0 to 120 seconds with 10 short entries.
- Tone: polished, confident, demo-ready, not hypey.
- Mention safety/urgency without sounding alarmist.
- Keep every line easy to record as human voiceover.
- Do not include markdown.
`;

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced ? fenced[1] : trimmed).trim());
}

const response = await client.messages.create({
  model,
  max_tokens: 2500,
  messages: [{ role: "user", content: prompt }],
});

const text = response.content
  .filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("\n");

const storyboard = extractJson(text);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(storyboard, null, 2)}\n`);

const voiceover = [
  "# Pit Stop Voiceover Script",
  "",
  `Generated with ${model}.`,
  "",
  ...storyboard.voiceover.map((line) => `**${line.start}s-${line.end}s**  \n${line.text}`),
  "",
].join("\n");

await fs.writeFile(voiceoverPath, voiceover);

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
console.log(`Wrote ${path.relative(repoRoot, voiceoverPath)}`);
console.log("Usage:", response.usage);
