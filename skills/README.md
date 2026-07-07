# Hearsay — custom Qwen Skills

Six reusable, triggerable units that package the court as a drop-in
**"adjudicate-a-dispute-fairly"** primitive (a named judging criterion). Each skill is a
directory with a `SKILL.md` (YAML frontmatter + TRIGGER) and stdlib-only `scripts/` that call a
running Hearsay instance over its HTTP/SSE API.

| Skill | What it does |
|---|---|
| `file-the-case` | decompose a story into a neutral case record |
| `argue-a-side` | the strongest good-faith argument for one side (incl. the Absent) |
| `empanel-jury` | typed votes from distinct value-lenses + vote-changes |
| `cross-examine` | ground a contested norm in a real source; surface the pivotal unknown |
| `deliver-verdict` | run a full trial and deliver the verdict card over comms-MCP |
| `flip-the-narration` | the live impartiality proof (court holds; a solo agent flips) |

```
HEARSAY_BASE=http://localhost:8787 python skills/deliver-verdict/scripts/run.py "my conflict..."
```
