# Hearsay ⚖️ — *hear both sides*

> **Every AI agrees with whoever's typing. Hearsay hears the one who isn't.**

Tell it the fight you can't stop replaying. A whole courtroom of AI agents hears it out — **a lawyer
for you, a lawyer for the person who isn't in the room, and a jury that actually argues** — then a
**deterministic Bench** hands down an honest verdict (`NTA · YTA · ESH · NAH`) and a fair way to make
peace. And it reaches the **same verdict even if the other side had typed it**, while a single AI flips
to flatter whoever's talking.

A single LLM handed a first-person account inherits your framing and is trained (RLHF) to be
agreeable — a **sycophancy machine**. Hearsay beats that *structurally*: a dedicated **Counsel for the
Absent** argues the omitted side, a jury of **distinct value-lenses** votes and **changes its mind on
camera**, and a non-LLM Bench judges **the deed, not the storyteller** — enforced by a live
**narrator-swap (POV-flip)** check.

Built for **Track 3 · Agent Society** of the Qwen Cloud Global AI Hackathon.

---

## The one mechanic

Type a real conflict → **Convene the court** → watch the society argue it out (both counsels, a
grounded exhibit, a juror scratched-out-and-redrawn vote) → the split-flap board flips to
`NTA · 5–2` → the court re-tries it from the other chair and lands the **same** place, beside a lone
agent that flip-flops. The whole of Track 3 — task division + dialogue + negotiation + conflict
resolution + **a measurable efficiency gain over a single-agent baseline** — reproducible by a
stranger, on their own life, in under two minutes.

The visual language is a **living courtroom sketch** (chalky pastel + charcoal on toned newsprint):
there are no cameras in a courtroom, so everything is drawn by the artist watching the society
deliberate. The art is hand-authored procedural SVG (`src/lib/sketch.ts`) — every mark intentional and
reproducible.

---

## What is REAL

Anything not listed here as real ships faked. Here is exactly where it lives in the code — and it all
works **cold, for a stranger, on their own conflict**, the moment a Qwen key is present.

| Real thing | Where |
|---|---|
| **Live inputs** — typed / pasted / a **real screenshot** read by `qwen3-vl` | `src/screens/Intake.tsx`, `server/qwen-court.ts#readScreenshot` |
| **The live Qwen society** over the user's input (Clerk → Counsels → Jury → Cross-examiner) | `server/qwen-court.ts`, `server/orchestrator.ts` |
| **Case-record decomposition** (Clerk, `qwen3.7-max` + thinking) | `server/qwen-court.ts#file` |
| **Both counsels' arguments** (`qwen3.6-flash`); the Absent is a labelled *imagined* best case | `#argue` |
| **The jury's typed votes + vote-changes** (`qwen3.7-plus`, structured) | `#jury`, `#deliberate` |
| **Grounded fact-checks** (Cross-examiner + Responses-API `web_search`/`web_extractor`) | `server/qwen.ts#ground` |
| **The one human question** on a genuine pivotal unknown (pause → answer → resume) | `server/orchestrator.ts` |
| **The deterministic Bench** — tally, `NTA/YTA/ESH/NAH`, POV-flip + bias-swap checks, calibration | `shared/bench.ts`, `shared/transform.ts` |
| **The live Court-vs-solo baseline** on the same input | `server/orchestrator.ts#runSolo` |
| **Every on-screen number** — vote split, POV-flip %, bias-swap %, tokens, rounds | computed by `shared/bench.ts` / `server/suite.ts`, never hard-coded |
| **Append-only NDJSON court record** per case (the transcript + audit trail) | `server/record.ts`, viewable in the Chambers |
| **Shareable link** encodes the inputs and re-computes | `src/lib/share.ts` |
| **Custom Skills + comms-MCP** | `skills/`, `mcp/comms-mcp/` |

The **deterministic Bench is real with or without a key** — it is plain arithmetic over the votes, so
the POV-flip / bias-swap agreement, the tally, and the calibration are genuine either way.

### The honest seam (no key? no problem)
When `DASHSCOPE_API_KEY` is **absent**, the app degrades to a **clearly-labelled demo engine**
(`server/demo-court.ts`): deterministic, scenario-aware arguments and votes so the *entire* machinery
— streaming, the vote-change, the human question, the Bench, the NDJSON record, the impartiality
computation — is exercisable end-to-end. A banner states plainly that arguments/votes are illustrative
while the Bench math, the record, and every number are real. **Set the key and the real Qwen society
activates instantly** — no code change. The `dashscope-intl` base URL and models are visible in
`server/qwen.ts` and `server/config.ts`.

---

## Architecture — the society *is* the courtroom

```
              ┌──────────────────────── the proceeding (server/orchestrator.ts) ───────────────────────┐
  user input  │  Clerk ── files ──▶ Counsel for You ─┐                                                   │
  (type/paste │  qwen3.7-max        qwen3.6-flash     ├─▶ Cross-examiner ──▶ [one human question?] ──▶   │
   /screenshot│                     Counsel/ Absent ──┘   qwen3.7-plus + web       (pivotal unknown)     │
   → qwen3-vl)│                     qwen3.6-flash                                                          │
              │        Jury (5–7 value-lenses, qwen3.7-plus, structured) ── deliberate ── vote-change ──▶ │
              │                        ▼                                                                   │
              │        the deterministic BENCH (shared/bench.ts, NON-LLM)                                  │
              │        tally → NTA/YTA/ESH/NAH · POV-flip + bias-swap checks · calibration · Fair Path     │
              └───────────────────────────────────────────────────────────────────────────────────────────┘
                        │ every beat streamed as a CourtEvent (SSE) + appended to the NDJSON record
                        ▼
     the living courtroom sketch (React + ported SK/UI engine)  ·  comms-MCP delivers the verdict card
```

- **One origin.** A single Node/[Hono](https://hono.dev) server (`server/index.ts`) serves the built
  React SPA **and** the `/api` society. In dev, Vite serves the client and proxies `/api`. Client code
  only ever calls relative `/api/*` — no hard-coded hosts or ports.
- **The provider seam** (`server/provider.ts`) lets the *same* orchestrator run over live Qwen
  (`QwenCourt`) or the demo engine (`DemoCourt`).
- **Streaming.** A trial is a sequence of `CourtEvent`s (`shared/types.ts`) streamed over SSE; the
  client renders them live and the server appends each to the case's NDJSON record.

### Project structure
```
repo/
├─ index.html · vite.config.ts · Dockerfile
├─ shared/        types.ts · bench.ts (the deterministic Bench) · transform.ts (bias-swap)
│                 lenses.ts · suite.ts (30-case suite) · examples.ts
├─ server/        index.ts (Hono) · orchestrator.ts · provider.ts
│                 qwen.ts (dashscope-intl client) · qwen-court.ts · demo-court.ts
│                 record.ts (NDJSON) · comms.ts · suite.ts · config.ts
├─ src/           main.tsx · App.tsx (hash router)
│  ├─ lib/        sketch.ts (SK engine) · ui-svg.ts (UI kit) · api.ts · share.ts
│  ├─ art/        Sketch.tsx (React art wrappers)
│  ├─ components/ ui.tsx (Card/Btn/Ribbon/Gauge/SplitFlap…) · Topbar.tsx
│  ├─ screens/    Intake · Trial (record/session/question/verdict) · Proof · Chambers · Docket · Numbers
│  ├─ state/      trial.ts (the CourtEvent reducer)
│  └─ styles/     tokens.css · app.css · screens.css
├─ skills/        6 custom Qwen Skills (SKILL.md + stdlib scripts)
├─ mcp/comms-mcp/ a real MCP (SSE) server: deliver_verdict · send_invite
└─ public/        fonts · manifest.webmanifest · sw.js (PWA)
```

---

## Run it

```bash
npm install

# dev (Vite on :5173 proxying /api to the Hono server on :8787)
npm run dev

# production build + run (one origin, :8787)
npm run build
npm start                       # → http://localhost:8787

# the comms-MCP server (optional, separate service)
npm run mcp                     # → http://localhost:8799/sse

# Docker (what Alibaba Cloud ECS/SAS runs)
docker build -t hearsay .
docker run -p 8787:8787 -e DASHSCOPE_API_KEY=sk-... hearsay
```

Runs on any modern Node (≥20). Works with **zero** environment variables (demo engine); every value
in `.env.example` activates a real path the moment it exists.

### Environment
| Var | What it turns on |
|---|---|
| `DASHSCOPE_API_KEY` | the live Qwen Cloud society (a plain `sk-` key on `dashscope-intl`) |
| `DASHSCOPE_BASE_URL` | override the OpenAI-compatible base (defaults to the intl endpoint) |
| `HEARSAY_MODEL_*` | per-role model routing (Clerk / Counsel / Jury / Cross / Vision / Solo) |
| `HEARSAY_GROUNDING` | `web_extractor` (free) · `web_search` · `off` |
| `TELEGRAM_BOT_TOKEN` · `SMTP_URL` | comms-MCP delivery of the verdict card + invite |
| `PORT` | server port (default 8787) |

---

## Custom Skills & comms-MCP (named rubric items)

- **6 Skills** in `skills/` package the court as a reusable *"adjudicate-a-dispute-fairly"* primitive:
  `file-the-case · argue-a-side · empanel-jury · cross-examine · deliver-verdict · flip-the-narration`.
  Each is a `SKILL.md` + stdlib `scripts/` that call a running instance. See `skills/README.md`.
- **comms-MCP** in `mcp/comms-mcp/` is a real MCP server (SSE) exposing `deliver_verdict` /
  `send_invite`, which Qwen's Responses API connects to. See `mcp/comms-mcp/README.md`.

---

## Deploy (Alibaba Cloud)

The `Dockerfile` produces a tiny self-contained image. Deploy on **ECS or Simple Application Server
(Singapore)** — the region that matches `dashscope-intl`. Inject `DASHSCOPE_API_KEY` (and optional
comms creds) as runtime env; never bake secrets into the image. The eligibility proof is the console
"Running" screenshot + a short backend recording + this repo's `server/qwen.ts` showing the
`dashscope-intl` base URL.

## Honest limitations
- **It judges fairly; it doesn't dispense justice** — a fair-reasoning mediator, not a court of law or
  therapy. Stated in-app.
- **The absent party is argued, not impersonated** — an *imagined* best case, disclosed, unless they
  opt in via the link.
- **Crowd consensus is a proxy, not morality** — the 30-case suite is a labelled small-N demonstration;
  the headline POV-flip / bias-swap metrics need no labels.
- **The metric is ours, and we defend it** — impartiality + accuracy + calibration per unit compute.
- **A trial takes a beat** — multi-agent deliberation is streamed round by round, so latency is owned.

## License
[MIT](./LICENSE).
