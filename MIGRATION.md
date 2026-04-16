# Migration Guide

## From v4.x → v5.0.0

v5.0.0 is a **major release** with breaking changes in the CLI surface. The
skill-level workflow (`make`, `fix`, `done`, `setup bridge`, `docs`) is
unchanged — if you drive Bridge from Claude Code, you only need to upgrade
the package.

### TL;DR

```bash
npm install @noemuch/bridge-ds@5
# or, if you installed the plugin:
# in Claude Code:
/plugin update bridge-ds
```

### Breaking changes

**1. `bridge-ds init` and `bridge-ds update` CLI commands removed.**

The legacy interactive CLI wizard has been retired. Typing `bridge-ds init`
now prints a deprecation notice pointing at the current flow:

```
bridge-ds init
  ! This command was removed in v5.0.0.
    Use: bridge-ds setup --ds-name <name> --figma-key <key>
         (or 'setup bridge' in Claude Code)
```

The interactive `bridge-ds init-docs` wizard remains available (headless
option too), but the recommended path is `setup bridge` inside Claude Code.

**2. Package `main` now points at `dist/`, not source.**

Consumers that imported Bridge programmatically via
`require("@noemuch/bridge-ds/lib/cli")` must update to:

```js
import { main, VERSION } from "@noemuch/bridge-ds";
// or, for the compiler:
import { compile } from "@noemuch/bridge-ds/compiler";
```

The package ships compiled JavaScript + `.d.ts` declarations.

**3. Compiler is now TypeScript, not CommonJS JS.**

The public `compile(options)` signature is preserved. If you imported the
compiler via `require("./lib/compiler/compile.js")` directly, switch to
`require("@noemuch/bridge-ds/compiler")` or `dist/lib/compiler/compile.js`.

**4. `figlet` dependency removed.**

The CLI banner is now inlined. No impact for CLI/plugin users; only
matters if your code imported `figlet` transitively through us.

**5. `ajv` + `ajv-formats` dependencies removed.**

They were unused inside Bridge. No user-visible impact.

### Non-breaking improvements

- Hardening: MCP server path-traversal protection
  (`ds://component/../evil` is rejected), YAML config parsing locked to
  `JSON_SCHEMA` (custom tags rejected at parse time).
- Tooling: ESLint 9 flat config + Prettier 3. Run `npm run lint`,
  `npm run format`, `npm run typecheck` locally.
- Release pipeline: tagged pushes (`vX.Y.Z`) trigger a signed npm publish
  via `.github/workflows/release.yml` with `--provenance`.
- CI: lint + typecheck + format-check job, full test suite job, npm cache
  across all jobs.
- Docs: README / CONTRIBUTING / CLAUDE.md refreshed to match the current
  skill structure. No more references to `/design-workflow`.
- `npm run version:sync` keeps package.json, the three plugin manifests,
  and `lib/cli/main.ts` in lock-step.

### Repo hygiene (noisy for contributors only)

Bridge no longer self-documents via its own docs pipeline — it's a CLI
tool, not a real design system. `docs.config.yaml`, `.bridge/`,
`bridge-ds/`, `design-system/`, `llms.txt`, and the orphan
`bridge-docs-cron.yml` workflow have all been removed from the repo. The
template for _user_ repos still lives in `lib/cli/setup-orchestrator.ts`.

### What has NOT changed

- Skill triggers (`make`, `fix`, `done`, `setup bridge`, `docs`).
- Scene graph schema.
- Knowledge base format (`bridge-ds/knowledge-base/registries/*.json`).
- MCP server URIs.
- GitHub Actions cron workflow (scaffolded into user repos unchanged).
- Semantic tokens & Figma Plugin API rule enforcement (all 26 rules).

### Rollback

```bash
npm install @noemuch/bridge-ds@4.1.0
```

No state to revert — v5.0.0 does not touch your knowledge base or
generated docs.

### Questions?

See [CHANGELOG.md](CHANGELOG.md) or open an issue at
<https://github.com/noemuch/bridge/issues>.

---

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

### What was new in v4.1.0

- Per-component `.llm.txt` sidecars (shadcn/ui pattern).
- SessionStart health line (`◆ Bridge: KB synced Xh ago · N components`).
- Token stdin hygiene improvements for `setup bridge`.
- Auto-detection of git remote + Figma URL from README/CLAUDE.md/package.json.
