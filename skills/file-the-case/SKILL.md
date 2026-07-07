---
name: file-the-case
description: Decompose a messy first-person conflict into a neutral case record — the parties, agreed facts, disputed facts, norms in play, and the real question before the court. Task decomposition, made legible.
---

# file-the-case

**TRIGGER.** Use when you have an unstructured account of an interpersonal conflict and need it filed as a structured, neutral docket before any judgement.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story" ["absent party"]
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
