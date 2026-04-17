# Bridge v5 → v6 Migration Guide

Bridge v6.0.0 is a deliberate cleanup release. The headline change: **the docs subsystem has been removed entirely**.

## Why

The docs subsystem (`bridge-ds docs build/sync/check/mcp`) produced empty boilerplate in practice. CSpecs — the user-authored content the docs were supposed to render — were never wired into the doc generator (`generate.ts` always passed `docs: {}`). The promise of "auto-maintained docs" was unfulfilled. Rather than wire CSpecs into a system nobody was using, we removed the system. See `docs/v6-cleanup-audit.md` for the full reasoning.

## What you need to do

### If you used `bridge-ds docs build` (or sync/check/mcp)

These commands no longer exist. Two paths:

- **Delete** the `design-system/` directory in your repo. It was an empty boilerplate forest.
- **Use a real docs platform** (Storybook, ZeroHeight, your-own-static-site) for hosted DS docs.

### If your cron worked off the docs subsystem

Re-run `setup bridge` in Claude Code. It will scaffold the new KB-only workflow that uses `npx -y @noemuch/bridge-ds@6.0.0 cron --config docs.config.yaml`. The new cron extracts KB, persists registries, and opens PRs with the diff.

### If you had `generating-ds-docs` slash commands

Removed. Your skill autocomplete is now 5 skills instead of 6.

### If you had `KBSchemaError` in your code

Still works — `assertKBCompatible` is the only export. It now throws plain `Error` instead of `KBSchemaError`, with the same actionable messages.

## What you DON'T need to do

- Your shipped CSpecs in `specs/shipped/` are untouched.
- Your recipes in `knowledge-base/recipes/` are untouched.
- Your `learnings.json` is untouched.
- Your `make` / `fix` / `done` workflow is unchanged.

## Upgrade command

```bash
/plugin update bridge-ds   # in Claude Code
```

Or for npm direct consumers:

```bash
npm install @noemuch/bridge-ds@6.0.0
```

Then in your DS repo:

```bash
bridge-ds doctor   # confirms KB still valid
```

If the doctor flags issues, follow its hints.
