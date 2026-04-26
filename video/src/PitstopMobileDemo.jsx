import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const W = 1080;
const H = 1920;

const asset = (name) => staticFile(`/assets/${name}`);

const firstPhoto = asset("brake-obstructed.jpg");
const secondPhoto = asset("brake-rotor-closeup.jpg");

const palette = {
  black: "#050505",
  white: "#f5f5f5",
  soft: "#b8b8b8",
  muted: "#6c6c6c",
  line: "rgba(255,255,255,0.12)",
  panel: "rgba(255,255,255,0.055)",
  green: "#27e58b",
  red: "#ff4b4b",
};

const sec = (value) => Math.round(value * FPS);

const ease = (frame, start, end, outStart = 0, outEnd = 1) =>
  interpolate(frame, [sec(start), sec(end)], [outStart, outEnd], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const fit = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

function Background() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 70) * 18;
  return (
    <AbsoluteFill style={{ background: palette.black, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -120,
          background:
            "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.09), transparent 34%), radial-gradient(circle at 25% 82%, rgba(255,255,255,0.045), transparent 32%)",
          transform: `translateY(${drift}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          opacity: 0.16,
        }}
      />
    </AbsoluteFill>
  );
}

function Phone({ children, glow = 0.35 }) {
  return (
    <div
      style={{
        width: 710,
        height: 1460,
        borderRadius: 78,
        padding: 20,
        background: "linear-gradient(145deg, #2b2b2b, #090909 38%, #1a1a1a)",
        boxShadow: `0 0 ${80 * glow}px rgba(255,255,255,${0.08 * glow}), 0 58px 140px rgba(0,0,0,0.65)`,
        border: "1px solid rgba(255,255,255,0.18)",
        position: "relative",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 58,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#080808",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            width: 168,
            height: 34,
            transform: "translateX(-50%)",
            borderRadius: 999,
            background: "#020202",
            zIndex: 20,
          }}
        />
        {children}
      </div>
    </div>
  );
}

function AppHeader({ title = "Pit Stop", subtitle = "CLAUDE OPUS 4.7" }) {
  return (
    <div style={{ padding: "72px 36px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 22, letterSpacing: 8, color: palette.muted, fontFamily: "monospace" }}>{subtitle}</div>
        <div style={{ fontSize: 54, fontWeight: 650, color: palette.white, marginTop: 8, letterSpacing: -1 }}>{title}</div>
      </div>
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: 18,
          border: `1px solid ${palette.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.white,
          fontSize: 28,
        }}
      >
        P
      </div>
    </div>
  );
}

function AuthScreen() {
  return (
    <div style={{ height: "100%", background: "#050505", padding: 38, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ letterSpacing: 10, color: palette.muted, fontFamily: "monospace", fontSize: 20, marginBottom: 18 }}>PIT STOP</div>
      <div style={{ color: palette.white, fontSize: 62, fontWeight: 700, lineHeight: 1.03, marginBottom: 42 }}>AI diagnostics for your garage.</div>
      <Segmented labels={["Sign in", "Create"]} active={1} />
      <Field icon="@" label="Username" value="fateen" />
      <Field icon="*" label="Password" value="demo123@" secret />
      <div style={{ height: 64, borderRadius: 12, background: palette.white, color: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, marginTop: 12 }}>
        Create account
      </div>
    </div>
  );
}

function Segmented({ labels, active }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${labels.length}, 1fr)`, gap: 8, background: "#101010", border: `1px solid ${palette.line}`, borderRadius: 12, padding: 6, marginBottom: 28 }}>
      {labels.map((label, index) => (
        <div
          key={label}
          style={{
            height: 52,
            borderRadius: 8,
            background: active === index ? palette.white : "transparent",
            color: active === index ? "#050505" : palette.soft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function Field({ icon, label, value, secret = false }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "monospace", color: palette.muted, letterSpacing: 3, fontSize: 17, marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ height: 64, border: `1px solid ${palette.line}`, borderRadius: 12, background: "#0d0d0d", display: "flex", alignItems: "center", padding: "0 18px", gap: 14 }}>
        <div style={{ color: palette.muted, fontSize: 22, width: 28 }}>{icon}</div>
        <div style={{ color: palette.white, fontSize: 24 }}>{secret ? "●".repeat(value.length) : value}</div>
      </div>
    </div>
  );
}

function GarageScreen() {
  return (
    <div style={{ height: "100%", background: "#070707" }}>
      <AppHeader title="Your Garage" subtitle="PRIVATE ACCOUNT" />
      <div style={{ padding: "120px 40px 0", color: palette.muted, textAlign: "center", fontSize: 24 }}>Your garage is empty.</div>
      <div style={{ margin: "48px auto", width: 410, height: 520, border: "1px dashed rgba(255,255,255,0.22)", borderRadius: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: palette.soft }}>
        <div style={{ width: 92, height: 92, borderRadius: "50%", border: `2px solid ${palette.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, marginBottom: 24 }}>+</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>Add Car</div>
      </div>
    </div>
  );
}

function AddCarScreen() {
  return (
    <div style={{ height: "100%", background: "#070707" }}>
      <AppHeader title="Pick your car" subtitle="GARAGE SETUP" />
      <div style={{ margin: "32px 42px", height: 340, borderRadius: 24, border: `1px solid ${palette.line}`, background: "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MinimalCar />
      </div>
      <div style={{ margin: "0 42px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Option title="Sedan" active />
        <Option title="SUV" />
      </div>
      <div style={{ margin: "36px 42px", border: `1px solid ${palette.line}`, borderRadius: 18, padding: 18, background: palette.panel }}>
        <div style={{ color: palette.muted, fontFamily: "monospace", letterSpacing: 4, fontSize: 17, marginBottom: 12 }}>CAR NAME</div>
        <div style={{ color: palette.white, fontSize: 30 }}>Daily Sedan</div>
      </div>
      <div style={{ margin: "0 42px", height: 66, borderRadius: 14, background: palette.white, color: "#050505", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>Save</div>
    </div>
  );
}

function Option({ title, active = false }) {
  return (
    <div style={{ height: 150, borderRadius: 18, border: active ? "1px solid #fff" : `1px solid ${palette.line}`, background: active ? "rgba(255,255,255,0.12)" : palette.panel, color: palette.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, fontWeight: 700 }}>
      {title}
    </div>
  );
}

function ChatScreen({ stage = "clarify" }) {
  const messages =
    stage === "clarify"
      ? [
          ["user", "i hear a screeching sound while driving"],
          ["ai", "Does it happen specifically when you press the brakes?"],
          ["user", "yes it is while braking"],
          ["ai", "Is it a high-pitched squeal, or a grinding/scraping sound?"],
          ["user", "it is a grinding sound"],
        ]
      : [
          ["ai", "Take a close-up photo through the wheel spokes showing the brake rotor and caliper."],
          ["system", "3D guidance: front wheel brake hotspot"],
        ];

  return (
    <div style={{ height: "100%", background: "#070707" }}>
      <AppHeader title="Daily Sedan" subtitle="INVESTIGATION" />
      <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.map(([type, text], index) => (
          <Bubble key={index} type={type} text={text} />
        ))}
      </div>
      {stage === "evidence" && (
        <div style={{ margin: "38px 42px 0", height: 330, borderRadius: 32, border: `1px solid ${palette.line}`, background: "rgba(255,255,255,0.03)", position: "relative", overflow: "hidden" }}>
          <MinimalCar top={90} />
          <Hotspot />
          <div style={{ position: "absolute", bottom: 26, left: 40, right: 40, color: palette.soft, fontSize: 25, textAlign: "center" }}>Focus: brake rotor through wheel</div>
        </div>
      )}
    </div>
  );
}

function Bubble({ type, text }) {
  const isUser = type === "user";
  const isSystem = type === "system";
  return (
    <div style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: isSystem ? "100%" : "82%", padding: "18px 22px", borderRadius: 22, background: isUser ? palette.white : isSystem ? "rgba(255,255,255,0.055)" : "#181818", color: isUser ? "#050505" : palette.white, border: isSystem ? `1px solid ${palette.line}` : "none", fontSize: 25, lineHeight: 1.35 }}>
      {text}
    </div>
  );
}

function EvidenceScreen({ accepted = false }) {
  return (
    <div style={{ height: "100%", background: "#070707" }}>
      <AppHeader title={accepted ? "Evidence accepted" : "Evidence rejected"} subtitle={accepted ? "ANALYSIS" : "VERIFY"} />
      <div style={{ margin: "28px 38px", height: 650, borderRadius: 30, border: `1px solid ${palette.line}`, background: "#111", overflow: "hidden", position: "relative" }}>
        <EvidenceImage src={accepted ? secondPhoto : firstPhoto} label={accepted ? "brake-rotor-closeup.jpg" : "brake-obstructed.jpg"} />
      </div>
      <div style={{ margin: "0 42px", padding: 28, borderRadius: 24, border: `1px solid ${accepted ? "rgba(39,229,139,0.45)" : "rgba(255,75,75,0.45)"}`, background: accepted ? "rgba(39,229,139,0.08)" : "rgba(255,75,75,0.08)" }}>
        <div style={{ color: accepted ? palette.green : palette.red, fontFamily: "monospace", letterSpacing: 5, fontSize: 18, marginBottom: 12 }}>{accepted ? "CLEAR VIEW" : "INSUFFICIENT"}</div>
        <div style={{ color: palette.white, fontSize: 34, fontWeight: 700, lineHeight: 1.12 }}>
          {accepted ? "Rotor surface and wear pattern are visible." : "Wheel photo does not show enough brake hardware."}
        </div>
        <div style={{ color: palette.soft, fontSize: 24, lineHeight: 1.38, marginTop: 18 }}>
          {accepted ? "Pit Stop can now compare the reported grinding with visual evidence." : "The app asks for a closer shot instead of guessing."}
        </div>
      </div>
    </div>
  );
}

function EvidenceImage({ src, label }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: palette.muted, fontSize: 24, padding: 40, textAlign: "center" }}>
        Save attached image as<br />video/public/assets/{label}
      </div>
      <Img src={src} style={fit} />
    </>
  );
}

function BriefScreen() {
  return (
    <div style={{ height: "100%", background: "#070707" }}>
      <AppHeader title="Diagnostic Brief" subtitle="HIGH URGENCY" />
      <div style={{ margin: "26px 38px", padding: 30, borderRadius: 26, background: "#121212", border: `1px solid ${palette.line}` }}>
        <div style={{ color: palette.red, fontFamily: "monospace", letterSpacing: 5, fontSize: 18, marginBottom: 14 }}>PRIMARY FAULT</div>
        <div style={{ color: palette.white, fontSize: 43, fontWeight: 760, lineHeight: 1.05 }}>Severe brake pad wear with likely rotor scoring</div>
        <Meter value={88} />
      </div>
      <BriefCard title="Why it matters" text="Grinding while braking can indicate metal-on-metal contact. Continued driving can reduce stopping power and damage the rotor." />
      <BriefCard title="Recommended action" text="Avoid normal driving. Book urgent brake inspection and likely pad and rotor service." />
      <BriefCard title="Saved to history" text="Case note saved for the vehicle, ready for the garage visit." />
    </div>
  );
}

function Meter({ value }) {
  return (
    <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: palette.red }} />
      </div>
      <div style={{ color: palette.soft, fontFamily: "monospace", fontSize: 20 }}>{value}%</div>
    </div>
  );
}

function BriefCard({ title, text }) {
  return (
    <div style={{ margin: "18px 38px", padding: 26, borderRadius: 24, background: palette.panel, border: `1px solid ${palette.line}` }}>
      <div style={{ color: palette.muted, fontFamily: "monospace", letterSpacing: 4, fontSize: 17, marginBottom: 10 }}>{title.toUpperCase()}</div>
      <div style={{ color: palette.white, fontSize: 27, lineHeight: 1.35 }}>{text}</div>
    </div>
  );
}

function MinimalCar({ top = 0 }) {
  return (
    <svg width="450" height="210" viewBox="0 0 450 210" style={{ marginTop: top }}>
      <path d="M54 132 Q72 72 144 62 L286 54 Q360 54 398 118 L418 145 Q426 166 404 170 L366 170 Q358 132 319 132 Q280 132 272 170 L174 170 Q166 132 127 132 Q88 132 80 170 L54 170 Q38 162 54 132Z" fill="rgba(255,255,255,0.88)" />
      <circle cx="126" cy="170" r="34" fill="#111" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
      <circle cx="320" cy="170" r="34" fill="#111" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
      <path d="M162 70 L203 66 L194 112 L128 112 Q138 82 162 70Z" fill="#101010" opacity="0.9" />
      <path d="M216 66 L285 64 Q322 66 350 112 L207 112Z" fill="#101010" opacity="0.9" />
    </svg>
  );
}

function Hotspot() {
  const frame = useCurrentFrame();
  const scale = 1 + Math.sin(frame / 9) * 0.12;
  return (
    <div style={{ position: "absolute", left: 135, top: 196, width: 92, height: 92, borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 34px rgba(255,255,255,0.55)", transform: `scale(${scale})` }} />
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const t = spring({ frame, fps: FPS, config: { damping: 120 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "monospace", letterSpacing: 14, color: palette.muted, fontSize: 28, marginBottom: 24 }}>PIT STOP</div>
      <div style={{ color: palette.white, fontSize: 86, fontWeight: 800, textAlign: "center", lineHeight: 0.95, width: 820, transform: `translateY(${(1 - t) * 50}px)`, opacity: t }}>
        AI diagnostics for the moment your car sounds wrong.
      </div>
    </AbsoluteFill>
  );
}

function Caption({ text }) {
  return (
    <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, color: palette.white, fontSize: 42, fontWeight: 760, lineHeight: 1.08, textAlign: "center", textShadow: "0 12px 36px rgba(0,0,0,0.8)" }}>
      {text}
    </div>
  );
}

function ChapterTitle({ text }) {
  const frame = useCurrentFrame();
  const opacity = ease(frame, 0, 0.6, 0, 1);
  return (
    <div style={{ position: "absolute", top: 82, left: 72, right: 72, color: palette.white, fontSize: 32, fontWeight: 700, opacity }}>
      {text}
    </div>
  );
}

function PhoneScene({ children, title, caption, scale = 1 }) {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: FPS, config: { damping: 100, stiffness: 80 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <ChapterTitle text={title} />
      <div style={{ transform: `scale(${scale}) translateY(${(1 - enter) * 80}px)`, opacity: enter }}>
        <Phone>{children}</Phone>
      </div>
      <Caption text={caption} />
    </AbsoluteFill>
  );
}

export const PitstopMobileDemo = ({ storyboard }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, Arial, sans-serif", background: palette.black }}>
      <Background />
      <div style={{ position: "absolute", top: 0, left: 0, width: `${progress * 100}%`, height: 5, background: palette.white, opacity: 0.9 }} />

      <Sequence from={sec(0)} durationInFrames={sec(8)}>
        <IntroScene />
      </Sequence>
      <Sequence from={sec(8)} durationInFrames={sec(10)}>
        <PhoneScene title="Secure account" caption="A private garage for every driver.">
          <AuthScreen />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(18)} durationInFrames={sec(11)}>
        <PhoneScene title="Start from zero" caption="New users see an empty garage.">
          <GarageScreen />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(29)} durationInFrames={sec(13)}>
        <PhoneScene title="Add the vehicle" caption="One car becomes one diagnostic workspace.">
          <AddCarScreen />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(42)} durationInFrames={sec(13)}>
        <PhoneScene title="Clarify the symptom" caption="Pit Stop asks before it guesses.">
          <ChatScreen stage="clarify" />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(55)} durationInFrames={sec(15)}>
        <PhoneScene title="Evidence check" caption="Weak evidence gets rejected.">
          <EvidenceScreen />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(70)} durationInFrames={sec(14)}>
        <PhoneScene title="3D hotspot guidance" caption="The app shows exactly where to aim.">
          <ChatScreen stage="evidence" />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(84)} durationInFrames={sec(14)}>
        <PhoneScene title="Useful evidence" caption="A close-up rotor photo unlocks the diagnosis.">
          <EvidenceScreen accepted />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(98)} durationInFrames={sec(14)}>
        <PhoneScene title="Garage-ready brief" caption="High urgency, plain English, next action.">
          <BriefScreen />
        </PhoneScene>
      </Sequence>
      <Sequence from={sec(112)} durationInFrames={sec(8)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, textAlign: "center" }}>
          <div style={{ color: palette.white, fontSize: 76, fontWeight: 850, lineHeight: 0.96 }}>From vague noise to repair-ready brief.</div>
          <div style={{ color: palette.soft, fontSize: 32, marginTop: 32 }}>{storyboard.url}</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
