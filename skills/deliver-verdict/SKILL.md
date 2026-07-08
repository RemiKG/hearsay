---
name: deliver-verdict
description: Run a full fair trial end-to-end and deliver the shareable verdict card (category, split, one-liner, Fair Path Forward) over the comms-MCP channel (Telegram / email).
---

# deliver-verdict

**TRIGGER.** Use to adjudicate a conflict and push the finished verdict card to a chat or inbox.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story" [telegram|email] [to]
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
