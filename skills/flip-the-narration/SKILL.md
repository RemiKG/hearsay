---
name: flip-the-narration
description: Run the impartiality proof: judge the same events from each side and compare. A fair court holds; a single sycophantic agent flips to flatter whoever is narrating.
---

# flip-the-narration

**TRIGGER.** Use to demonstrate — live — that a judgement is impartial (POV-flip stable) rather than narrator-flattering.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story" ["absent party"]
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
