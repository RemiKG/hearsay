---
name: empanel-jury
description: Convene a jury of distinct value-lenses (Empath, Stickler, Pragmatist, Elder, Free Spirit, ...) and collect their typed votes (NTA/YTA/ESH/NAH + confidence + reason), including any vote a juror changes on the record after deliberation.
---

# empanel-jury

**TRIGGER.** Use when you want a panel of diverse moral frames to each vote on a conflict, rather than one voice.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story"
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
