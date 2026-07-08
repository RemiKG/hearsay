---
name: cross-examine
description: Stress-test a claim and ground a contested norm or fact in a real source (via Qwen's web_extractor / web_search), returning an exhibit; surface the one pivotal unknown a verdict turns on.
---

# cross-examine

**TRIGGER.** Use when a judgement hinges on a checkable fact or norm (an expected tip, a lease clause, adequate notice) that should be grounded before ruling.

A reusable unit of Hearsay's "fair-adjudication / debiased-judgment" primitive. It calls a
running Hearsay instance (set `HEARSAY_BASE`, default `http://localhost:8787`), which routes
the reasoning through Qwen Cloud models on `dashscope-intl` (or the clearly-labelled demo
engine when no `DASHSCOPE_API_KEY` is present).

## Usage
```
HEARSAY_BASE=https://<your-app> python scripts/run.py "story"
```

Output is plain text / JSON for easy piping into an agent loop. See `scripts/run.py`.
