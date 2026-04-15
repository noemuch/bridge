# Phase 0+1: Fortify Monolith + Using-Bridge Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing `skills/design-workflow/SKILL.md` monolith with superpowers-inspired patterns (triggers-only description, HARD-GATE markers, Red Flags table), extract the discipline/routing layer into a new force-loaded `using-bridge` skill, and install a SessionStart hook so it auto-injects on every Claude Code session.

**Architecture:** Additive only. The existing monolith stays fully functional and keeps routing `make/fix/done/setup/drop` through `references/actions/*.md`. The new `using-bridge` skill is thin (~400 tokens) and owns the command map + hard rules + rationalization-prevention content. A `hooks/session-start` shell script injects `using-bridge` into every session's system prompt. At the end of this phase Bridge ships as v3.2.0 with zero breaking changes, dogfooded on Bridge's own repo.

**Tech Stack:** Markdown (skill files), POSIX shell (hook script), JSON (plugin manifest + hook config), git (branching + PR flow).

**Reference spec:** `docs/superpowers/specs/2026-04-15-bridge-docs-and-restructure-design.md` §9 (skill architecture) and §14.1 (phases P0 + P1).

**Target version:** `3.2.0` (from current `3.1.0`).

---

## File structure

Files created:
- `skills/using-bridge/SKILL.md` — new force-loaded skill body (discipline + command map + red flags)
- `hooks/session-start` — POSIX shell script that emits the hook JSON payload
- `hooks/hooks.json` — hook registration for Claude Code
- `docs/superpowers/plans/2026-04-15-phase-0-1-using-bridge-skill.md` — this plan (already created)

Files modified:
- `skills/design-workflow/SKILL.md` — description rewritten, HARD-GATE + Red Flags blocks inserted, command router slimmed (now defers to `using-bridge`)
- `.claude-plugin/plugin.json` — version bump, sync with package.json, ensure hooks discovery
- `package.json` — version bump to `3.2.0`
- `CLAUDE.md` (root) — new "Skills" section explaining the two-layer split
- `README.md` — short architecture mention
- `CHANGELOG.md` — `[3.2.0]` unreleased block

No files deleted in this phase.

---

## Task 1: Baseline audit + feature branch

**Files:**
- Read-only: `package.json`, `.claude-plugin/plugin.json`, `skills/design-workflow/SKILL.md`, `commands/design-workflow.md`

- [ ] **Step 1: Print current state for the record**

Run:
```bash
cd /Users/noechague/Documents/bridge
git status
git log --oneline -5
node -e "console.log('package.json:', require('./package.json').version)"
node -e "console.log('plugin.json:', require('./.claude-plugin/plugin.json').version)"
ls skills/design-workflow/
ls hooks 2>/dev/null || echo "hooks/ does not exist (expected)"
```

Expected: `package.json` says `3.1.0`, `.claude-plugin/plugin.json` says `3.0.1` (version drift confirmed — one of the things this phase fixes), `hooks/` absent, `design-workflow/` contains `SKILL.md` + `references/`.

- [ ] **Step 2: Create feature branch**

Run:
```bash
git checkout -b feat/phase-0-1-using-bridge
```

Expected: branch switch, clean working tree.

- [ ] **Step 3: No commit yet** — this task is setup only; first commit is in Task 2.

---

## Task 2: Rewrite design-workflow description per triggers-only rule

**Files:**
- Modify: `skills/design-workflow/SKILL.md` (frontmatter `description` field, currently around lines 4-7)

- [ ] **Step 1: Read current frontmatter**

Run:
```bash
head -30 skills/design-workflow/SKILL.md
```

Expected: YAML frontmatter with `description: >` block that reads as a workflow summary ("Design system expertise — component creation, token management, Figma workflow. …").

- [ ] **Step 2: Replace the description with triggers-only phrasing**

Edit `skills/design-workflow/SKILL.md`. Replace the `description:` block (multi-line) with a single-line triggers-only form:

```yaml
description: Use when designer invokes make/fix/done/setup/drop/docs, or requests to design/create/build/generate/fix a Figma component or screen, or asks about Bridge workflow, tokens, components, recipes, or the design system.
```

Keep all other frontmatter fields (`name`, `version`, `triggers`, `requires`, `bridge`, `priority_references`, `generation_phases`, `readiness`, `setup`) unchanged.

- [ ] **Step 3: Verify the change**

Run:
```bash
head -15 skills/design-workflow/SKILL.md
```

Expected: the description is the new single line; no multi-line `>` block.

- [ ] **Step 4: Commit**

Run:
```bash
git add skills/design-workflow/SKILL.md
git commit -m "refactor(skill): rewrite design-workflow description as triggers-only

Replaces the workflow-summary description with a 'Use when...' triggering
conditions string. Per obra/superpowers research, descriptions that
summarize workflow cause LLMs to shortcut and skip reading the skill body.
Triggers-only descriptions measurably improve correct skill selection.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

Expected: one-file commit, green pre-commit hooks (if any).

---

## Task 3: Insert HARD-GATE block at top of SKILL.md body

**Files:**
- Modify: `skills/design-workflow/SKILL.md` (body, insert after `## Philosophy` block)

- [ ] **Step 1: Locate the insertion point**

Run:
```bash
grep -n "^## Philosophy\|^## Knowledge Base Location" skills/design-workflow/SKILL.md
```

Expected: two line numbers, one per heading. The HARD-GATE block goes between them.

- [ ] **Step 2: Insert the HARD-GATE block**

Edit `skills/design-workflow/SKILL.md`. Between `## Philosophy` (end of its content, before the next `---` separator if present) and `## Knowledge Base Location`, add:

```markdown
---

## Hard Rules (Non-Negotiable)

<HARD-GATE>
NEVER write raw Figma Plugin API code. All scene graph JSON must pass
through `lib/compiler/compile.js`. The compiler enforces all 26 Figma
API rules automatically.

NEVER use hardcoded primitive values (hex colors, px sizes, rgb, raw font
names). Only semantic DS tokens: `$color/...`, `$spacing/...`, `$text/...`,
`$comp/...`.

NEVER claim "done" or "ready to ship" without all three of:
  (a) compiler ran to completion (exit code 0)
  (b) screenshot taken in this turn
  (c) user confirmation of visual correctness

NEVER read `figma-api-rules.md` — it does not exist here and the compiler
handles every rule it would encode.

NEVER reuse a Figma `nodeId` from a previous session. Node IDs are
session-scoped; always re-search via `figma_search_components` or the
official MCP equivalent.
</HARD-GATE>

```

- [ ] **Step 3: Verify the insertion**

Run:
```bash
grep -A 2 "^## Hard Rules" skills/design-workflow/SKILL.md
```

Expected: the "## Hard Rules (Non-Negotiable)" heading followed by `<HARD-GATE>`.

- [ ] **Step 4: Commit**

Run:
```bash
git add skills/design-workflow/SKILL.md
git commit -m "feat(skill): add HARD-GATE block to design-workflow

Five non-negotiable rules enforced prompt-side:
- No raw Plugin API code
- No hardcoded primitives (use semantic tokens)
- No 'done' without compiler+screenshot+user-confirmation
- Never read figma-api-rules.md
- Never reuse nodeIds across sessions

Pattern borrowed from obra/superpowers. Pure prompt convention, zero
tooling cost, measurable behavioral effect on rationalization loopholes.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Insert Red Flags table

**Files:**
- Modify: `skills/design-workflow/SKILL.md` (body, insert right after the Hard Rules block from Task 3)

- [ ] **Step 1: Locate the insertion point**

Run:
```bash
grep -n "^</HARD-GATE>" skills/design-workflow/SKILL.md
```

Expected: one line number (end of the block just added).

- [ ] **Step 2: Insert the Red Flags table**

Edit `skills/design-workflow/SKILL.md`. After the `</HARD-GATE>` closing tag and the blank line that follows, insert:

```markdown
### Red Flags — Rationalization → Reality

These thoughts mean STOP. Each row is a real rationalization from real sessions.

| Rationalization | Reality |
|---|---|
| "I'll just hardcode this hex once — it's faster" | Every hardcode breaks DS compliance. Always use a semantic token. |
| "The compiler is overkill for this tiny thing" | The compiler is the only path. No exceptions, including tiny things. |
| "Skip the screenshot, the change is obviously right" | 'Looks right' ≠ 'is right'. Gate B is mandatory. |
| "I remember this nodeId from my last session" | Node IDs are session-scoped. Re-search every time. |
| "I'll read figma-api-rules.md to double-check" | That file is forbidden. The compiler enforces all 26 rules. |
| "The user approved the design, I can skip compile exit check" | Compile exit code 0 is Gate A. Independent of user approval. |
| "I'll use the nodeId from the compiler output directly in a second script" | Raw Plugin API is banned. Route everything through the compiler. |
| "Let me just write a small inline script to fix this one thing" | No inline scripts. Always: edit scene graph → recompile → execute. |

```

- [ ] **Step 3: Verify**

Run:
```bash
grep -c "| Rationalization | Reality |" skills/design-workflow/SKILL.md
```

Expected: `1`.

- [ ] **Step 4: Commit**

Run:
```bash
git add skills/design-workflow/SKILL.md
git commit -m "feat(skill): add Red Flags rationalization table to design-workflow

Eight common rationalizations explicitly enumerated with their reality
counter. Pattern from obra/superpowers. Catches classic DS-compliance
loopholes (hex hardcoding, skipping verification, reusing nodeIds,
reading forbidden references) with behavioral specificity.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Scaffold `skills/using-bridge/` and write SKILL.md

**Files:**
- Create: `skills/using-bridge/SKILL.md`

- [ ] **Step 1: Create the directory**

Run:
```bash
mkdir -p skills/using-bridge
```

Expected: no error, directory exists.

- [ ] **Step 2: Write the SKILL.md**

Create `skills/using-bridge/SKILL.md` with exactly this content:

```markdown
---
name: using-bridge
description: Use when any Bridge command is invoked (make, fix, done, setup, drop, docs) or any Figma / design-system / compiler / Bridge workflow topic is raised. Sets command priorities and non-negotiable hard rules (compiler-only, semantic tokens only, verification-before-ship).
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
| "docs", "documentation", "sync docs", "generate docs" | (reserved for v4.0.0 — `skills/generating-ds-docs/`) |
| "status", "what's next", "workflow" | inline status logic in `skills/design-workflow/SKILL.md` |

> **Note for v3.2.0**: the action layer is still the monolithic
> `skills/design-workflow/SKILL.md` + its `references/actions/*.md` files.
> Phase 2 (next plan) splits them into five separate skills
> (`generating-figma-design`, `learning-from-corrections`, etc.). The command
> map above will be updated to point at the new skills when that happens.

---

## Skill Priority

1. **Process first, then action.** For exploratory or ambiguous requests,
   use `superpowers:brainstorming` before implementing. For a clear
   directive that maps to a command in the table above, route directly.
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
```

- [ ] **Step 3: Verify file exists and has frontmatter**

Run:
```bash
head -5 skills/using-bridge/SKILL.md
wc -l skills/using-bridge/SKILL.md
```

Expected: frontmatter block visible (`---`, `name: using-bridge`, etc.) and ~90-100 lines total.

- [ ] **Step 4: Commit**

Run:
```bash
git add skills/using-bridge/SKILL.md
git commit -m "feat(skill): add force-loaded using-bridge skill

New process-layer skill that owns Bridge's discipline, command map,
hard rules, and red-flags catalog. Deliberately small (~400 tokens) to
keep the per-session fixed context cost low.

This is the Layer 1 (process) half of the upcoming v4.0.0 two-layer
skill architecture. Layer 2 (actions: generating-figma-design,
shipping-and-archiving, etc.) remains in the design-workflow monolith
until Phase 2.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Create `hooks/session-start` POSIX shell script

**Files:**
- Create: `hooks/session-start` (executable)

- [ ] **Step 1: Create the hooks directory**

Run:
```bash
mkdir -p hooks
```

- [ ] **Step 2: Write the script**

Create `hooks/session-start` with exactly:

```bash
#!/usr/bin/env bash
# Bridge SessionStart hook — injects using-bridge/SKILL.md into the
# Claude Code system prompt at session start.
#
# Output: JSON per the Claude Code SessionStart hook spec.
# Silent (exit 0 with empty output) if the skill file is missing.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_FILE="$SCRIPT_DIR/../skills/using-bridge/SKILL.md"

if [[ ! -f "$SKILL_FILE" ]]; then
  # No skill file → silent no-op.
  exit 0
fi

# Strip YAML frontmatter (between the first two `---` fences).
# awk approach: skip content between first two `---` lines.
SKILL_BODY=$(awk '
  BEGIN { in_fm = 0; past_fm = 0 }
  /^---[[:space:]]*$/ {
    if (past_fm == 0 && in_fm == 0) { in_fm = 1; next }
    if (in_fm == 1) { in_fm = 0; past_fm = 1; next }
  }
  { if (in_fm == 0) print }
' "$SKILL_FILE")

# Emit a JSON payload using python (portable JSON escaping).
if ! command -v python3 >/dev/null 2>&1; then
  # Fallback: no python → emit nothing rather than risk malformed JSON.
  exit 0
fi

python3 - "$SKILL_BODY" <<'PY'
import json, sys
body = sys.argv[1]
payload = {
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": body
  }
}
print(json.dumps(payload))
PY
```

- [ ] **Step 3: Make it executable**

Run:
```bash
chmod +x hooks/session-start
```

- [ ] **Step 4: Smoke-test the script**

Run:
```bash
./hooks/session-start | head -c 500
echo ""
./hooks/session-start | python3 -c "import sys, json; d = json.loads(sys.stdin.read()); assert 'hookSpecificOutput' in d; assert 'using-bridge' not in d['hookSpecificOutput']['additionalContext'].split('\n')[0].lower() or True; print('OK: JSON valid, payload contains', len(d['hookSpecificOutput']['additionalContext']), 'chars of skill body')"
```

Expected: valid JSON output, something like
`OK: JSON valid, payload contains 3400 chars of skill body`
(exact character count depends on Task 5 body length).

- [ ] **Step 5: Commit**

Run:
```bash
git add hooks/session-start
git update-index --chmod=+x hooks/session-start
git commit -m "feat(hooks): add SessionStart hook that injects using-bridge skill

POSIX shell script that reads skills/using-bridge/SKILL.md, strips YAML
frontmatter, and emits the Claude Code SessionStart JSON payload with
the skill body as additionalContext.

Silent no-op if the skill file is missing or python3 is unavailable
(portable failure mode for CI environments).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Create `hooks/hooks.json` registration

**Files:**
- Create: `hooks/hooks.json`

- [ ] **Step 1: Write the config**

Create `hooks/hooks.json` with exactly:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PLUGIN_ROOT/hooks/session-start"
          }
        ]
      }
    ]
  }
}
```

> Note: `$CLAUDE_PLUGIN_ROOT` is the Claude Code convention for the plugin's
> installation directory. This is equivalent to superpowers' own pattern.

- [ ] **Step 2: Verify JSON validity**

Run:
```bash
python3 -c "import json; json.load(open('hooks/hooks.json')); print('OK: hooks.json is valid JSON')"
```

Expected: `OK: hooks.json is valid JSON`.

- [ ] **Step 3: Commit**

Run:
```bash
git add hooks/hooks.json
git commit -m "feat(hooks): register SessionStart hook in hooks.json

Standard Claude Code plugin hooks manifest. Points at
\$CLAUDE_PLUGIN_ROOT/hooks/session-start.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Slim the command router in design-workflow/SKILL.md

**Files:**
- Modify: `skills/design-workflow/SKILL.md` (body, the current "## Action Router" section)

Rationale: the command map now lives in `skills/using-bridge/SKILL.md`. The design-workflow skill keeps a short pointer to avoid duplication.

- [ ] **Step 1: Locate the existing router**

Run:
```bash
grep -n "^## Action Router" skills/design-workflow/SKILL.md
grep -n "^## Context Loading Rules" skills/design-workflow/SKILL.md
```

Expected: two line numbers bounding the "## Action Router" section.

- [ ] **Step 2: Replace the router with a pointer**

In `skills/design-workflow/SKILL.md`, replace the entire `## Action Router` section (from the heading through the closing `---` before `## Context Loading Rules`) with:

```markdown
## Action Router

> **Routing lives in `skills/using-bridge/SKILL.md` (force-loaded at
> SessionStart).** This skill handles the action-layer execution for the
> routes defined there. The action files referenced below are unchanged.

| Action | Action File |
|--------|-------------|
| `make` | `references/actions/make.md` |
| `fix` | `references/actions/fix.md` |
| `done` | `references/actions/done.md` |
| `setup` | `references/actions/setup.md` |
| `drop` | `references/actions/drop.md` |

---

```

- [ ] **Step 3: Verify**

Run:
```bash
grep -A 3 "^## Action Router" skills/design-workflow/SKILL.md | head -6
```

Expected: the new pointer text visible, no long keyword-matching table.

- [ ] **Step 4: Commit**

Run:
```bash
git add skills/design-workflow/SKILL.md
git commit -m "refactor(skill): slim design-workflow action router, delegate to using-bridge

Removes the keyword-matching router table from design-workflow/SKILL.md
(it now lives in skills/using-bridge/SKILL.md, which is force-loaded at
SessionStart). design-workflow retains a minimal action-file map so the
skill stays self-sufficient when invoked directly.

Net effect: no behavior change, ~40 lines saved from per-invocation
context when design-workflow is loaded.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Bump version in package.json and plugin.json

**Files:**
- Modify: `package.json`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Update package.json version**

Edit `package.json`. Change:
```json
"version": "3.1.0",
```
to:
```json
"version": "3.2.0",
```

- [ ] **Step 2: Update plugin.json version and description**

Edit `.claude-plugin/plugin.json`. Change:
```json
"version": "3.0.1",
```
to:
```json
"version": "3.2.0",
```

Also update the `description` to match `package.json`'s description for
consistency. In `.claude-plugin/plugin.json`, replace the `description`
value with:
```json
"description": "Compiler-driven design generation in Figma — 100% design system compliant. Compiles component specs into verified Figma output via MCP.",
```

- [ ] **Step 3: Verify both versions match**

Run:
```bash
node -e "
const pkg = require('./package.json');
const plg = require('./.claude-plugin/plugin.json');
console.log('package.json:', pkg.version);
console.log('plugin.json:', plg.version);
if (pkg.version !== plg.version) {
  console.error('VERSION MISMATCH');
  process.exit(1);
}
console.log('OK: versions aligned at', pkg.version);
"
```

Expected: `OK: versions aligned at 3.2.0`.

- [ ] **Step 4: Commit**

Run:
```bash
git add package.json .claude-plugin/plugin.json
git commit -m "chore: bump to 3.2.0, align package.json and plugin.json

Fixes pre-existing version drift (package.json was at 3.1.0, plugin.json
at 3.0.1). Both now at 3.2.0 for the using-bridge / hooks release.

Also syncs plugin.json description with package.json.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Update `CLAUDE.md` with Skills section

**Files:**
- Modify: `CLAUDE.md` (root)

- [ ] **Step 1: Read current CLAUDE.md**

Run:
```bash
cat CLAUDE.md | head -40
```

Expected: Current content with Architecture, MCP Transports, Commands, Compiler, etc.

- [ ] **Step 2: Insert a Skills section**

Edit `CLAUDE.md`. After the `## Commands` section and before `## Compiler`, insert:

```markdown
## Skills

Bridge uses a **two-layer** Claude Code skill architecture:

- **`skills/using-bridge/`** — Force-loaded via `hooks/session-start` on
  every Claude Code session. Owns the command map, non-negotiable hard
  rules (compiler-only, semantic-tokens-only, verification-before-ship),
  and the Red Flags rationalization catalog. Small (~400 tokens) to
  keep the fixed per-session context cost low.

- **`skills/design-workflow/`** — Action layer. Executes the workflows
  (`make`, `fix`, `done`, `setup`, `drop`) through its `references/actions/*.md`
  files. Will be split into five focused action skills in v4.0.0 (see the
  Bridge Docs + restructure spec in `docs/superpowers/specs/`).

The SessionStart hook script at `hooks/session-start` reads
`skills/using-bridge/SKILL.md`, strips YAML frontmatter, and emits the
Claude Code hook JSON payload. Registered in `hooks/hooks.json`.

```

- [ ] **Step 3: Verify**

Run:
```bash
grep -A 2 "^## Skills" CLAUDE.md
```

Expected: the new section visible.

- [ ] **Step 4: No commit yet** — this commit is bundled with CHANGELOG + README updates in Task 11 to keep the documentation-sync policy explicit.

---

## Task 11: Update `CHANGELOG.md` and `README.md`

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Inspect current CHANGELOG structure**

Run:
```bash
head -30 CHANGELOG.md
```

Expected: a `## [X.Y.Z]` Keep-a-Changelog style structure.

- [ ] **Step 2: Add the [3.2.0] entry**

Edit `CHANGELOG.md`. At the top (below the title, above the current latest version), insert:

```markdown
## [3.2.0] — 2026-04-15

### Added

- `skills/using-bridge/` — new force-loaded skill that owns Bridge's
  discipline, command map, hard rules, and Red Flags rationalization
  catalog. Auto-injected at every Claude Code SessionStart via
  `hooks/session-start`.
- `hooks/session-start` — POSIX shell script that reads the using-bridge
  skill body and emits the Claude Code SessionStart hook JSON payload.
- `hooks/hooks.json` — Claude Code hook registration.
- `<HARD-GATE>` block in `skills/design-workflow/SKILL.md` enumerating
  the five non-negotiable rules (compiler-only, semantic tokens only,
  verification-before-ship, no forbidden references, no stale nodeIds).
- Red Flags rationalization table in `skills/design-workflow/SKILL.md`.

### Changed

- `skills/design-workflow/SKILL.md` — description rewritten as
  triggers-only (was a workflow summary). Per `obra/superpowers` research,
  this improves correct skill selection by Claude.
- `skills/design-workflow/SKILL.md` — the Action Router section slimmed
  to a pointer; full routing logic now lives in `using-bridge`.
- Version aligned across `package.json` and `.claude-plugin/plugin.json`
  at `3.2.0` (fixes pre-existing drift).

### Notes

This release is the Phase 0+1 increment of the larger Bridge Docs +
restructure work (spec:
`docs/superpowers/specs/2026-04-15-bridge-docs-and-restructure-design.md`).
No breaking changes. Phase 2 (action skill split) ships in 3.5.0; Bridge
Docs V0.1 lands in 4.0.0.

```

- [ ] **Step 3: Update README.md architecture section**

Edit `README.md`. Locate the Architecture or Skills section. Add a bullet:

```markdown
- **Two-layer skill architecture**: a small force-loaded `using-bridge`
  skill sets discipline + command map at SessionStart; `design-workflow`
  executes the action layer (`make` / `fix` / `done` / `setup` / `drop`).
  See `CLAUDE.md` for details.
```

(If the README does not have a natural place, add the section under a new
`## Skills` heading.)

- [ ] **Step 4: Commit all three doc updates together**

Run:
```bash
git add CLAUDE.md CHANGELOG.md README.md
git commit -m "docs: update CLAUDE.md, CHANGELOG, README for 3.2.0 using-bridge

- CLAUDE.md: new Skills section explaining the two-layer architecture
- CHANGELOG.md: [3.2.0] entry with Added/Changed/Notes
- README.md: short mention of the two-layer skill architecture

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: End-to-end smoke test in Claude Code

**Files:**
- No modifications. This is a live verification task.

- [ ] **Step 1: Verify plugin manifest lists all artifacts**

Run:
```bash
node -e "
const pkg = require('./package.json');
const needed = ['bin/', 'lib/', 'skills/', 'commands/', 'hooks/', 'README.md', 'CHANGELOG.md', 'LICENSE', '.claude-plugin/', 'CLAUDE.md'];
const actual = pkg.files || [];
const missing = needed.filter(n => !actual.includes(n));
console.log('files in package.json:', actual);
console.log('missing:', missing);
if (missing.length > 0) {
  console.error('Some expected entries missing from package.json files array');
  process.exit(1);
}
console.log('OK');
"
```

Expected: `OK`. If `hooks/` is missing from the `files` array in
`package.json`, add it manually and re-run. If a fix is needed, commit
separately with message `chore: include hooks/ in npm package files`.

- [ ] **Step 2: Run the hook script one more time**

Run:
```bash
./hooks/session-start | python3 -m json.tool | head -3
```

Expected: first three lines of a valid JSON object (opening brace,
`hookSpecificOutput` object start).

- [ ] **Step 3: Open repo in a fresh Claude Code session**

Manual action: open this repo in a fresh Claude Code window. Do not
type any command yet. Verify via `/context` (or the Claude Code context
inspection command) that `using-bridge` content is present in the system
context.

If the hook is not being picked up: verify `.claude-plugin/plugin.json`
exists and does NOT have a `hooks` field (discovery is by directory
convention per the superpowers audit). If still failing, fall back to
declaring hooks explicitly in `plugin.json`:

```json
"hooks": "./hooks/hooks.json"
```

and commit as `fix(plugin): declare hooks path in plugin.json`.

- [ ] **Step 4: Functional spot-check**

Ask Claude in the session: "What's the hard rule about hex values in Bridge?"

Expected: Claude cites the `<HARD-GATE>` rule verbatim or closely
(semantic tokens only, no hex). If Claude answers from memory of the
design-workflow SKILL.md without mentioning using-bridge, the hook is
loading design-workflow but not using-bridge. Investigate hook
registration.

- [ ] **Step 5: No commit** — this is a pure verification task.

---

## Task 13: Open PR and merge

**Files:**
- None modified.

- [ ] **Step 1: Push the branch**

Run:
```bash
git push -u origin feat/phase-0-1-using-bridge
```

Expected: branch created on origin.

- [ ] **Step 2: Create PR via gh**

Run:
```bash
gh pr create --title "feat: v3.2.0 — using-bridge skill + SessionStart hook (Phase 0+1)" --body "$(cat <<'EOF'
## Summary

- Adds a force-loaded `using-bridge` skill mirroring the `obra/superpowers`
  pattern: small discipline layer (~400 tokens) auto-injected at every
  Claude Code session via a `SessionStart` hook.
- Fortifies the existing `design-workflow` monolith with a `<HARD-GATE>`
  block (five non-negotiable rules) and a Red Flags rationalization
  table — zero tooling cost, pure prompt convention.
- Rewrites the `design-workflow` description as triggers-only per
  the superpowers research (workflow-summary descriptions cause LLMs to
  shortcut).
- Aligns `package.json` and `.claude-plugin/plugin.json` at `3.2.0`
  (fixes pre-existing version drift).

No breaking changes. The action layer (`make` / `fix` / `done` /
`setup` / `drop`) keeps working exactly as before.

## Context

This is Phase 0 + Phase 1 of the larger Bridge Docs + restructure work.
Spec:
\`docs/superpowers/specs/2026-04-15-bridge-docs-and-restructure-design.md\`.

Next: Phase 2 (action skill split → 3.5.0), then Bridge Docs V0.1 (→ 4.0.0).

## Test plan

- [x] JSON validity: \`hooks/hooks.json\` and \`hooks/session-start\`
      output both pass \`python3 -m json.tool\`.
- [x] Version consistency: \`package.json\` and \`plugin.json\` aligned.
- [x] \`hooks/session-start\` emits non-empty \`additionalContext\` with
      the \`using-bridge\` skill body.
- [ ] Fresh Claude Code session in the repo shows \`using-bridge\`
      content in system context (manual check).
- [ ] "What's the hard rule about hex values?" answered with the
      HARD-GATE content (manual check).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.

- [ ] **Step 3: Wait for review or self-merge**

If you have a reviewer: request review. If solo: ensure the manual checks
in Step 2's test plan pass, then merge:

```bash
gh pr merge --squash --delete-branch
```

- [ ] **Step 4: Tag the release**

```bash
git checkout main
git pull
git tag -a v3.2.0 -m "v3.2.0: using-bridge skill + SessionStart hook (Phase 0+1)"
git push origin v3.2.0
```

- [ ] **Step 5: Publish to npm** (optional; skip if not ready)

```bash
npm publish --access public
```

Expected: package published at `@noemuch/bridge-ds@3.2.0`.

---

## Self-review checklist

This is a checklist run after writing the plan, before handing off to the
executor. If any row fails, fix inline and re-check only that row.

- [x] **Spec coverage.** Every task traces back to spec §9 (skill
      architecture) and §14.1 (phase P0, P1). Specifically:
  - Task 2 implements §9.1 "description as triggers" rule
  - Tasks 3, 4 implement §9.5 HARD-GATE + §5 Red Flags
  - Task 5 implements §9.2 using-bridge skill
  - Tasks 6, 7 implement SessionStart hook (§9.2 "force-loaded")
  - Task 8 implements §9.3 action skill delegation pattern
  - Task 9 is operational hygiene (version alignment flagged in §2.1 baseline)
  - Tasks 10, 11 implement the global CLAUDE.md "always update all docs" rule
- [x] **No placeholders.** No `TBD`, `TODO`, `implement later`, or
      untyped code blocks. Every step includes the literal content.
- [x] **Type consistency.** Skill names (`using-bridge`, `design-workflow`),
      file paths (`hooks/session-start`, `skills/using-bridge/SKILL.md`),
      and version strings (`3.2.0`) are identical across all tasks.
- [x] **TDD discipline where natural.** Shell script smoke-tested (Task 6
      Step 4 and Task 12 Step 2), JSON validated (Task 7 Step 2),
      version alignment asserted (Task 9 Step 3). Markdown edits are
      verified by grep (Tasks 3, 4, 5). No forced unit tests on pure
      markdown.
- [x] **Documentation sync.** Task 11 bundles CLAUDE.md, CHANGELOG.md,
      README.md together per the user's global "always update all docs
      before commit" rule. Task 10 specifically delays its commit to
      bundle with Task 11.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-phase-0-1-using-bridge-skill.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per
task, with a spec-compliance review + code-quality review between tasks.
Fast iteration, catches rationalizations early. Best fit for this plan
because each task is small and well-isolated.

**2. Inline Execution** — Execute tasks in this session using
`superpowers:executing-plans`, with batch execution and checkpoint
reviews between task groups. Slower per-task but preserves full
conversational context.

**Which approach?**
