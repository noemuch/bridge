---
name: generating-ds-docs
description: Use when the user says "docs", "documentation", "sync docs", "generate docs", "rebuild docs", or after a component ship to cascade docs updates. Runs one of six modes (init, full-build, sync, check, mcp, headless-sync) against the knowledge base to produce the user's design-system/ tree.
---

# Generating DS Docs

## Overview

Runs the docs pipeline against the knowledge base: registries + learnings + specs + recipes → generated `.md` files under `design-system/`. Triggered interactively by the user, at ship-time by `shipping-and-archiving`, or headlessly by the cron.

## When to Use

Invoke when:
- The user says "docs", "documentation", "sync docs", "rebuild docs".
- `shipping-and-archiving` cascades after a new component ship.
- The cron (headless) runs a daily sync.

Do NOT use if:
- The knowledge base does not yet exist — run `extracting-design-system` first.
- The user is still designing — use `generating-figma-design`.

## Procedure

Select the mode based on invocation:

### Mode 1 — init

Scaffold `design-system/` tree + `docs.config.yaml` + `.github/workflows/bridge-docs-cron.yml` + `.bridge/mcp.json`. Implemented by `bridge-ds init-docs` (CLI wizard). This mode in-skill just confirms the user wants the scaffold and runs the CLI.

### Mode 2 — full-build

Regenerate every doc from scratch.

```bash
npx @noemuch/bridge-ds docs build
```

### Mode 3 — sync

Incremental cascade from a KB diff.

```bash
npx @noemuch/bridge-ds docs sync
```

### Mode 4 — check

Lint without regen.

```bash
npx @noemuch/bridge-ds docs check
```

### Mode 5 — mcp

Launch the local MCP server (stdio).

```bash
npx @noemuch/bridge-ds docs mcp
```

### Mode 6 — headless-sync

Cron entrypoint. Invoked by `.github/workflows/bridge-docs-cron.yml` with `FIGMA_TOKEN` set.

<HARD-GATE>
NEVER regenerate docs without a valid `_index.json` — if missing, run Mode 2 (full-build) first.

NEVER write inside the `_manual/` directory. The preservation layer refuses.

NEVER publish a PR from the cron when the linter reports critical issues — label `needs-linter-fix` instead.
</HARD-GATE>

## Red Flags

See the full catalog at `references/red-flags-catalog.md` (repo-root).

Top flags for this skill:
- "I'll manually edit a generated doc to fix a typo" → **Edit the CSpec.docs block or a `_manual/` region; regen will overwrite inline edits.**
- "The cron opened an empty PR" → **Cron emits no PR on no-diff; if you see one, it's a bug — file an issue.**

## Verification

This skill is gated by `references/verification-gates.md` (repo-root):

- **Gate C (Lint)** — mandatory before any docs PR is opened or committed. Linter must report 0 critical issues.

Evidence to surface: linter output, list of regenerated files, migration guides if any.

## Skill-specific references

- `lib/docs/generate.ts` — orchestrator
- `lib/cron/orchestrator.ts` — cron entry
- `lib/docs/templates/*.hbs` — Handlebars templates
