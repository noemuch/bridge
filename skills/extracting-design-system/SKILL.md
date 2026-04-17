---
name: extracting-design-system
description: Use when the user says "setup", "setup bridge", "extract", "extract DS", "onboard", "build knowledge base", "initialize bridge", or is starting Bridge in a project for the first time. Handles the complete bootstrap: pre-flight checks, scaffolding (docs.config.yaml, cron workflow, .bridge/mcp.json), Figma token management (stdin-only), DS extraction via MCP (preferred) or REST (fallback), guide generation, and first commit proposal.
---

# Extracting Design System

## Overview

Single-entry-point skill for Bridge's initial setup AND subsequent re-extracts. Orchestrates the complete flow from empty repo to "docs shipped" via 8 procedural steps. Uses the `setup-orchestrator` module (Bash tool) + MCP tools (figma-console-mcp) + user prompts.

## When to Use

Invoke when the user:
- says "setup bridge", "setup", "init", "extract", "extract DS", "onboard", "build KB", "refresh registries"
- has just installed the Bridge plugin and wants to bootstrap a repo
- wants to re-extract after an upstream Figma change

Do NOT use if:
- the user is designing a component — use `generating-figma-design`
- the user is processing manual corrections — use `learning-from-corrections`
- the user is shipping a design — use `shipping-and-archiving`

## Procedure

**Before starting, load:**
- `references/transport-adapter.md` (repo-root) — for MCP transport detection

### Step 1 — Pre-flight checks

Run via Bash tool:
```bash
node --version
git rev-parse --is-inside-work-tree
gh auth status
```

Then Node:
```js
const { runPreflight } = require("/path/to/node_modules/@noemuch/bridge-ds/dist/lib/cli/setup-orchestrator.js");
const { gitRemote, figmaKey } = await runPreflight();
```

Report to user in conversation:
```
✓ Node 20 · git repo · gh auth OK
📍 Detected git remote: {gitRemote or "(none)"}
📍 Detected Figma URL in README: {figmaKey or "(none)"}
```

### Step 2 — Ask for Figma file URL (skip if auto-detected and user confirms)

If `figmaKey` is null from pre-flight:
```
Paste the Figma DS file URL:
```

Extract the key via the regex `figma\.com\/(?:design|file)\/([a-zA-Z0-9_-]+)`.

### Step 3 — Ask for Figma Personal Access Token

**IMPORTANT**: token must be stdin-masked. Use Claude Code's native password prompt (`AskUserQuestion` tool with type=password if available, otherwise instruct the user via terminal).

```
Paste your Figma PAT (hidden, never logged).
Press Enter to skip — we'll use the plugin path (interactive extraction only).
```

If provided:
- Validate via `validateFigmaToken(token)` — if 401, abort
- Probe via `probeVariablesEndpoint(token, fileKey)` — note plan tier

If skipped: plan to use MCP path only (no cron support until token added later).

### Step 4 — Scaffold the repo

Via Bash:
```bash
node -e "
const { scaffold } = require('@noemuch/bridge-ds/dist/lib/cli/setup-orchestrator.js');
(async () => {
  const created = await scaffold({
    dsName: '$DS_NAME',
    figmaFileKey: '$FIGMA_KEY',
    cronCadence: 'daily',
    cronTime: '06:00',
  });
  console.log(JSON.stringify(created, null, 2));
})();
"
```

Report:
```
✓ Scaffolded 8 files/directories:
  - bridge-ds/knowledge-base/registries/
  - design-system/
  - docs.config.yaml
  - .github/workflows/bridge-docs-cron.yml
  - .bridge/mcp.json
  - llms.txt
  - design-system/_manual/README.md
```

### Step 5 — Store token in GitHub Secrets (if provided)

Via Bash:
```bash
node -e "
const { storeTokenInGitHubSecret } = require('@noemuch/bridge-ds/dist/lib/cli/setup-orchestrator.js');
(async () => {
  const result = await storeTokenInGitHubSecret({
    token: process.env._FIGMA_TOKEN_TEMP,
    repo: '$GITHUB_REPO',
    fileKey: '$FIGMA_KEY',
  });
  console.log(JSON.stringify(result));
})();
" 2>&1
```

Where `_FIGMA_TOKEN_TEMP` is set for the duration of this single command invocation ONLY, then unset.

### Step 6 — Detect transport + extract via MCP (preferred)

Per `references/transport-adapter.md`:
- `figma_get_status` via MCP → if available and `setup.valid: true`, use console transport
- Otherwise, fall back to REST (headless) with graceful 403 handling for non-Enterprise

**During extract**, Claude Code should display progress events from the MCP tool calls. Pattern:
- After each `figma_get_design_system_kit` / `figma_get_variables` / `figma_search_components` batch, report to user:
  ```
  ⠋ Extracted: 42/156 components · 130/856 variables · 12/49 text styles
  ```

### Step 7 — Validate extracted data + write registries

Sample import probe (3–5 keys per registry type). If any fail, re-extract the failing entries (max 3 attempts).

Write to `bridge-ds/knowledge-base/registries/{components,variables,text-styles,icons,logos,illustrations}.json`.

Report:
```
✓ Registries validated. Keys verified.
  - Components: 156 (100%)
  - Variables: 856 (100%)
  - ...
```

### Step 8 — Propose initial commit

```
Propose initial commit? [Y/n]
```

If Y, Bash:
```bash
git add .
git commit -m "feat: bootstrap Bridge KB via setup bridge"
git push origin $(git rev-parse --abbrev-ref HEAD)
```

Finally, propose first cron run:
```
Trigger first cron run now to verify the workflow? [Y/n]
```

If Y, Bash:
```bash
gh workflow run bridge-docs-cron.yml --repo $GITHUB_REPO
gh run watch
```

### Final report

```
✨ Setup complete in Xm Ys.

Your DS:
  Repo:      https://github.com/{repo}
  Docs:      design-system/ (rendered on GitHub)
  LLM index: llms.txt · .llm.txt sidecars
  MCP:       ds://component/<name>

Next steps:
  • Say "make <description>" to design a new component/screen
  • Say "fix" after manual Figma edits
  • Say "done" to ship + cascade
  • Daily cron runs at 06:00 UTC automatically
```

<HARD-GATE>
NEVER write a registry entry without a `key` field (hex hash for
components/icons/logos; name path for variables).

NEVER mark setup complete without validating a sample of keys
(3–5 per registry) via a live import probe.

NEVER echo or log the Figma PAT. Token goes from stdin → validate
→ `setGitHubSecret` (stdin pipe to gh CLI). Wipe buffer afterward.

NEVER use an interactive CLI wizard. Bridge is plugin-only — use `setup bridge` via Claude Code.
</HARD-GATE>

## Red Flags

See the full catalog at `references/red-flags-catalog.md` (repo-root).

Top flags for this skill:
- "I'll skip the key validation, the names look fine" → **Names are not keys. Validate by import.**
- "I'll use nodeIds — they're easier to copy" → **NodeIds are session-scoped. Keys are persistent.**
- "I'll export FIGMA_TOKEN in the shell first" → **Never. stdin-only via `setGitHubSecret`.**

## Verification

- **Gate A / B / C** — not applicable in V3.3.0/V4.1.0 (setup doesn't compile, execute, or generate docs directly — it composes them). Internal gates: key-validation, schema conformance, token-pipe discipline.

Evidence to surface: per-registry entry counts, key-validation probe results, scaffold file list, token mask (never full value).

## Skill-specific references

- `lib/cli/setup-orchestrator.ts` — shared orchestration logic
- `lib/cli/token-handling.ts` — stdin pipe + validate
- `lib/kb/auto-detect.ts` — git remote + Figma URL detection
- `references/transport-adapter.md` (repo-root) — MCP vs REST decision
