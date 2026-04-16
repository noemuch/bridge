# Migration Guide

## From v4.0.0 → v4.1.0

**TL;DR:** No breaking changes. Upgrade with:

```bash
npm install @noemuch/bridge-ds@4.1.0
```

Or via Claude Code plugin update:

```
/plugin update bridge-ds
```

No config changes required. Your existing `docs.config.yaml`,
`bridge-ds/`, `design-system/`, and `.github/workflows/bridge-docs-cron.yml`
remain valid.

### What's new (you don't have to do anything)

- **Per-component `.llm.txt` sidecars** will be created on the next
  `docs build` or cron run. These are additive — existing `.md` + `.json`
  files are unchanged.
- **SessionStart health line**: next time you open Claude Code in your
  repo, you'll see a one-line status: `◆ Bridge: KB synced Xh ago · N components`.
- **Token stdin hygiene** improvements apply automatically to any future
  `setup bridge` invocation.

### What's deprecated (still works in v4.1.0)

- **`bridge-ds init-docs`** CLI wizard: emits a yellow DeprecationWarning
  on startup. The command still works for v4.x but will be removed in
  v5.0.0. Use `setup bridge` in Claude Code instead:

  ```
  # In Claude Code, in your DS repo:
  setup bridge
  ```

  The skill handles everything the CLI wizard did, plus more
  (auto-detection, progress reporting, GitHub secret setup in one flow).

### What has NOT changed

- MCP server URIs (`ds://component/<name>`, etc.) — unchanged.
- Scene graph schema and compiler behavior — unchanged.
- Skill names and Claude Code integration — unchanged (6 skills, same routes).
- GitHub Actions cron workflow — unchanged (same `bridge-docs-cron.yml`).
- Knowledge base format (`bridge-ds/knowledge-base/registries/*.json`) — unchanged.

### If you were installing via tarball (pre-npm-publish)

The v4.0.0 tag was on GitHub but not on npm. If you were doing:

```bash
npm install /path/to/noemuch-bridge-ds-4.0.0.tgz
```

You can now switch to:

```bash
npm install @noemuch/bridge-ds@4.1.0
```

### Rollback

If you need to revert:

```bash
npm install @noemuch/bridge-ds@4.0.0   # from GitHub tag via npm pack
# or
git checkout v4.0.0                    # if you vendored the code
```

No state changes to revert (all v4.1.0 additions are non-destructive).

### Questions?

See [CHANGELOG.md](CHANGELOG.md) for the full list of changes, or open an
issue at https://github.com/noemuch/bridge/issues.
