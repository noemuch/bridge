---
name: using-bridge
description: Use when any Bridge command is invoked (make, fix, done, setup, drop) or any Figma / design-system / compiler / Bridge workflow topic is raised. Sets command priorities and non-negotiable hard rules (compiler-only, semantic tokens only, verification-before-ship).
---

# Using Bridge

Bridge is a **compiler-driven** design workflow for generating Figma designs
and maintaining a design system via Claude Code. The compiler (at
`lib/compiler/compile.js`) enforces all 26 Figma Plugin API rules, so Claude
NEVER writes raw Plugin API code and NEVER hardcodes primitive values.

This skill is **force-loaded at every SessionStart** via `hooks/session-start`.
Its job is to establish the discipline before any action skill runs. It is
deliberately small (~400 tokens) to keep the fixed per-session cost low.

---

## Command Map

| User intent (keywords) | Route to |
|---|---|
| "make", "design", "create", "build", "generate", "new component", "new screen" | `skills/design-workflow/` → `references/actions/make.md` |
| "fix", "correct", "learn", "diff", "what changed", "I adjusted" | `skills/design-workflow/` → `references/actions/fix.md` |
| "done", "ship", "ship it", "finish", "complete" | `skills/design-workflow/` → `references/actions/done.md` |
| "setup", "extract", "extract DS", "onboard" | `skills/design-workflow/` → `references/actions/setup.md` |
| "drop", "abandon", "cancel" | `skills/design-workflow/` → `references/actions/drop.md` |
| "status", "what's next", "workflow" | inline status logic in `skills/design-workflow/SKILL.md` |

---

## Skill Priority

1. **Process first, then action.** For exploratory or ambiguous requests,
   brainstorm the intent first before implementing. For a clear directive
   that maps to a command in the table above, route directly.
2. **Verification before completion.** No "done" without evidence
   (see Hard Rules below).
3. **Minimal context.** Load only the references needed for the current
   action. See `skills/design-workflow/SKILL.md` "Context Loading Rules".

---

## Hard Rules (Non-Negotiable)

<HARD-GATE>
NEVER write raw Figma Plugin API code. All scene graph JSON must pass
through `lib/compiler/compile.js`.

NEVER use hardcoded primitive values. Only semantic DS tokens
(`$color/...`, `$spacing/...`, `$text/...`, `$comp/...`).

NEVER claim "done" without:
  (a) compiler ran to completion (exit code 0)
  (b) screenshot taken in this turn
  (c) user confirmation of visual correctness

NEVER read `figma-api-rules.md` — the compiler enforces all 26 rules.

NEVER reuse a Figma `nodeId` from a previous session.
</HARD-GATE>

---

## Red Flags — Rationalization → Reality

| Rationalization | Reality |
|---|---|
| "I'll just hardcode this hex once" | Always use a semantic token. No exceptions. |
| "The compiler is overkill for this tiny thing" | The compiler is the only path. |
| "Skip the screenshot, it's obviously right" | 'Looks right' ≠ 'is right'. |
| "I remember this nodeId from my last session" | Node IDs are session-scoped. Re-search. |
| "I'll use figma-api-rules.md for context" | That file is forbidden. Compiler owns all rules. |
| "The user approved, I can skip the compile exit code check" | Compile exit 0 is Gate A. Independent of user approval. |
| "Let me write a small inline Plugin API script for this fix" | No inline scripts. Scene graph → compiler → execute. |

---

## References

- Compiler reference: `skills/design-workflow/references/compiler-reference.md`
- Transport adapter (console vs official MCP): `skills/design-workflow/references/transport-adapter.md`
- Quality gates: `skills/design-workflow/references/quality-gates.md`
- CSpec templates: `skills/design-workflow/references/templates/`

---

## Conversation Language Rule

- **Conversation** with the user: their language (detect from context).
- **All generated artifacts** (KB files, CSpecs, guides, learnings, recipes,
  scene graphs, docs, specs, plans): **English only**. This rule is
  non-negotiable per Bridge's artifact policy.
