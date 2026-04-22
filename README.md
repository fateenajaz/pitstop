# 🏁 Pit Stop

### Autonomous Vehicle Diagnostic Investigation — Powered by Claude Opus 4.7

Describe a symptom. Opus 4.7 runs a complete multi-phase investigation — deciding what evidence it needs, asking for it, challenging its own conclusions — all within a single bounded agentic loop.

---

## What Makes This Different

Pit Stop is not a chatbot wrapper with a car theme. It is a single bounded agentic loop that fully orchestrates itself using three capabilities that exist only in Claude Opus 4.7 and are strictly impossible on Opus 4.6:

| Capability | What Pit Stop Uses It For | Why It Matters |
| :--- | :--- | :--- |
| **Task Budgets** (`task-budgets-2026-03-13`) | Opus sees its own token budget as a live countdown and self-manages investigation depth | We don't orchestrate the phases — the model decides when to move between them |
| **Adaptive Thinking** (`thinking: {type: "adaptive"}`) | Summarized reasoning streams to the frontend in real time | Shows how the model is thinking, not just what it concluded |
| **3.75MP High-Resolution Vision + 1:1 Pixel Coordinates** | Fault localization returned as exact pixel bounding boxes on the original image | Every annotation references a specific visual observation, never a generic guess |

---

## The Core Thesis

A driver describes a symptom. Claude Opus 4.7:

1.  **Forms 3 ranked hypotheses** with confidence scores
2.  **Decides autonomously** whether existing evidence is sufficient (confidence > 0.80 → skip to verification)
3.  **Identifies the exact visual evidence needed** to disambiguate, if not sufficient
4.  **Requests one specific photo** with precise angle and lighting instructions
5.  **Analyzes the new image** at full 3.75MP resolution using 1:1 pixel coordinates
6.  **Challenges its own top hypothesis** — actively looking for contradictions
7.  **Outputs a structured Diagnostic Brief artifact** with pixel-accurate annotations

The output is not a chat message. It is a **Diagnostic Brief** — a structured artifact that represents the end-state of an autonomous investigation.
