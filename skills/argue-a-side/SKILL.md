---
name: argue-a-side
description: Manufacture the strongest good-faith argument for ONE side of a conflict — including Counsel for the Absent, who argues the imagined best case for the person who isn't in the room (never their real words).
---

# argue-a-side

**TRIGGER.** Use to hear one advocate argue a single side as strongly as it can honestly be argued — especially the omitted side of a first-person story.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story" [you|absent]
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
