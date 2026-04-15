# Verification Gates

> Shared by every action skill. Each gate is a hard requirement: no
> rationalization excuses. See `red-flags-catalog.md` for the
> counter-responses to the common excuses.

---

## Gate A — Compile Gate

**When:** Before any Figma Plugin API execution (i.e. before `figma_execute`
/ `use_figma`).

**Checks:**
- The compiler ran to completion with exit code 0.
- No hardcoded primitives in the scene graph JSON (no raw hex, px, rgb,
  or font-family strings outside `$token` references).
- All `$token` references resolve against the knowledge base registries.

**Evidence required in-conversation:**
- Compiler stdout/stderr showing success.
- The scene graph JSON (or its diff) produced by Claude.

**Applies to:** `generating-figma-design`, `learning-from-corrections`
(when it re-compiles after a correction).

---

## Gate B — Visual Gate

**When:** After any Figma execution, before claiming any work is "done"
or "ready to ship".

**Checks:**
- A screenshot was taken in the current turn (not a recollection from a
  previous turn or a previous session).
- The screenshot is visually consistent with the spec intent (Claude
  describes what it sees; user confirms).
- The user has explicitly confirmed correctness ("done", "ship it", or
  equivalent) — passive silence does not satisfy the gate.

**Evidence required in-conversation:**
- Fresh screenshot tool result.
- User confirmation text.

**Applies to:** `shipping-and-archiving` (mandatory), `generating-figma-design`
(end of each iteration).

---

## Gate C — Lint Gate

**When:** Before any docs-related artifact (docs PR, ds-docs sync output)
is committed or opened as a PR. V3.3.0 scope: applies only to future
`generating-ds-docs` skill; listed here for completeness and to anchor
V4.0.0 contracts.

**Checks:**
- All code examples in generated docs parse (language-specific).
- All `$token` refs in generated docs resolve against current registries.
- All Figma deeplinks are URL-valid (scheme + host + file-key format).
- Frontmatter schema validates.
- No provenance markers (`<!-- source: ... -->`) point to removed
  sources.

**Evidence required in-conversation:** linter tool result (stdout).

**Applies to:** `generating-ds-docs` (V4.0.0+).

---

## Per-action gate requirements

| Action skill                  | Gate A | Gate B | Gate C |
| ----------------------------- | ------ | ------ | ------ |
| `generating-figma-design`     | ✅     | ✅     | —      |
| `learning-from-corrections`   | ✅ (if recompiling) | ✅ (after re-execute) | — |
| `shipping-and-archiving`      | —      | ✅     | — (V4.0.0: ✅) |
| `extracting-design-system`    | —      | —      | —      |
| `generating-ds-docs`          | —      | —      | ✅ (V4.0.0+) |

---

## Skip policy

**Non-skippable (NEVER):**
- Gate A for any skill that compiles.
- Gate B before claiming done.
- User confirmation before compilation.

**Skippable with warning (logged in `specs/active/{name}.skip.log`):**
- Recipe matching.
- Screenshot reference analysis (visual consistency beyond "it looks
  right").
- Individual CSpec acceptance criteria.

When skipping:
1. Warn the user explicitly about the quality impact.
2. Log the skip reason.
3. Surface as an advisory issue in the next `fix` cycle.

See `red-flags-catalog.md` for rationalizations and counter-responses.
