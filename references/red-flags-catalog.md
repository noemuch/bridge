# Red Flags Catalog — Rationalization → Reality

> Every row is a real rationalization from real sessions. When you catch
> yourself thinking one of these, STOP. Read the "Reality" column aloud.
> Proceed per the reality, not the rationalization.

---

## Compiler & scene graph

| Rationalization | Reality |
|---|---|
| "I'll just hardcode this hex once — it's faster." | Every hardcode breaks DS compliance. Always use a semantic token. |
| "The compiler is overkill for this tiny thing." | The compiler is the only path. No exceptions, including tiny things. |
| "Let me write a small inline Plugin API script for this fix." | No inline scripts. Always: edit scene graph → recompile → execute. |
| "I'll use `figma-api-rules.md` to double-check a rule." | That file is forbidden. The compiler enforces all 26 rules. |
| "The user approved the design, I can skip the compile exit-code check." | Compile exit 0 is Gate A. Independent of user approval. |

## Figma state & nodeIds

| Rationalization | Reality |
|---|---|
| "I remember this nodeId from my last session." | NodeIds are session-scoped. Re-search via `figma_search_components` every time. |
| "I'll reuse the nodeId from the compiler output in a follow-up script." | Raw Plugin API is banned. Route everything through the compiler. |

## Verification

| Rationalization | Reality |
|---|---|
| "Skip the screenshot, the change is obviously right." | 'Looks right' ≠ 'is right'. Gate B is mandatory. |
| "The user said 'nice', that's confirmation enough." | Confirmation must be explicit (`done`, `ship it`, or equivalent). |
| "I'll mark it done and fix the last issue in a follow-up." | No partial done. Gate B is all-or-nothing. |

## Spec & CSpec

| Rationalization | Reality |
|---|---|
| "This is a one-off, I don't need a CSpec." | Every Figma write needs a CSpec. No exceptions. |
| "I'll skip acceptance criteria, the intent is obvious." | Minimum 3 acceptance criteria. Intent ≠ criteria. |

## Knowledge base

| Rationalization | Reality |
|---|---|
| "The registries are stale but close enough." | If registries are stale, run `setup` first. Stale data → broken `$token` references. |
| "I'll store this as a flag learning even though it's hardcoded." | Flags are for DS gaps, not for shortcuts. Hardcoded values get fixed, not logged. |

---

## How to use this catalog

Each action skill's `## Red Flags` section links here rather than
duplicating the table. If a new rationalization pattern emerges in the
field, add a row to the relevant section in this file — not to an
individual skill.
