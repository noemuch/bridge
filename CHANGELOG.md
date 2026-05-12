# Changelog

All notable changes to Bridge DS are documented here.

## [7.0.1] — 2026-05-12

### Fixed

- **`LintConfig.functionsDir` is now honored at runtime.** v7.0.0 declared the
  field in the schema but the engine ignored it — consumer-side custom
  functions (`bridge-ds/lint/functions/*.js`) failed with `Unknown Spectral
  function "<name>"`. v7.0.1 loads them via dynamic import.

### Note

- TS source files in functionsDir are skipped with a warning — consumers
  must pre-compile (run `tsc` and point functionsDir at the dist) or
  author directly in `.js` / `.mjs` / `.cjs`. Future versions may add
  transparent TS support via ts-node.

## [7.0.0] — 2026-05-12

DS rules engine. Bridge ships a Spectral-based rules runtime that enforces design-system conventions across three surfaces: the compiler, a new `bridge-ds lint` CLI, and a skill-overlay layer that injects active rules into Claude Code at generation time.

### Added

- **`lib/lint/` runtime** wrapping `@stoplight/spectral-core` — rules engine, config loader, coverage reporter, skill-overlay renderer.
- **`@noemuch/bridge-ds-rule-api`** workspace package — frozen public TS API for authoring custom rules. Semver-protected (closed unions for Severity/Category/Surface/Status are intentional; adding a value is a major bump).
- **18 universal built-in rules** in `lib/lint/builtin/` across 6 categories (tokens, structure, naming, interaction, workflow, copy). Bundled in `bridge:recommended` and `bridge:strict` presets.
- **`bridge-ds lint` CLI command** with `--config`, `--fail-severity`, `--coverage` flags.
- **Compiler integration** — `CompileOptions.lintConfigPath` makes the compiler load + apply compile-time rules and fail-fast on `severity: error`. Exposed via an async overload of `compile()`; the legacy sync `compile(options)` form is preserved for v6 callers.
- **Skill overlay** — `{{ACTIVE_RULES}}` placeholder in `SKILL.md` of `generating-figma-design`, `learning-from-corrections`, `shipping-and-archiving`. Rendered by `hooks/skill-load`. Top-of-file placement + structured `[ID] RULE — RATIONALE — EXAMPLE` triples based on IFEval / AdvancedIF / Lost-in-the-Middle research.
- **DTCG 2025.10 schema rule** as a built-in (warn-severity).
- **Custom-function stubs** for the 10 placeholders referenced by built-in rules (one-time warn per stub; consumers can override with real impls).

### Changed

- `package.json` adds `@stoplight/spectral-core`, `@stoplight/spectral-functions`, `@stoplight/spectral-rulesets`, `ajv`, `ajv-formats` as deps.
- `package.json` declares `workspaces: ["packages/*"]`.
- `lib/cli/main.ts` registers the `lint` subcommand.
- `build` script now copies yaml + json resources from `lib/lint/builtin/` into `dist/` post-tsc so the published package can resolve `bridge:recommended` and other rule files at runtime.

### Backward compatibility

**v6 → v7 is opt-in. Existing consumers see no behavioural change unless they create `bridge-ds/lint/config.yaml`.** Compiler, skills, and cron run as before when the file is absent. The legacy sync `compile(options)` form is preserved — v7 adds an async overload for the new lint-aware path.

### Migration

See `BREAKING.md`.

## [6.2.2] — 2026-05-11

Hotfix on top of 6.2.1: catch orphan variants whose parent set isn't published.

### Fixed

- **Variants published individually (no parent SET in `/component_sets`) leaked into the registry.** The 6.2.1 node-ID dedup only filters variants whose parent SET is published. Real libraries sometimes publish individual variant COMPONENTs without a SET wrapper, and those slipped through. Added a name-pattern secondary filter using Figma's variant-naming convention (`key=value, key=value`) so those orphans are dropped too.

### Trade-off

The heuristic excludes any component whose name starts with `^\w[\w-]*=`. A legitimate top-level component intentionally named like that (e.g. `key=primary`) would be dropped — possible in theory, very unusual in practice. Documented here so it's not a surprise.

## [6.2.1] — 2026-05-11

Hotfix on top of 6.2.0: dedupe variants against component-set children.

### Fixed

- **Variant instances were no longer being filtered out.** The Figma REST `/v1/files/{key}/components` endpoint does not return a `componentSetId` field (despite what other docs and SDKs suggest), so the v6.2.0 filter `!c.component_set_id` silently kept every variant row. A library with 60 SETs averaging 20 variants each would balloon the registry to ~1200 rows, all named in Figma's `variant=primary, size=medium` form. v6.2.1 dedupes by node ID instead: it collects every child ID returned by the SET `/nodes` fetches and drops any `/components` row whose `node_id` is in that set. The output now matches the MCP path: one row per published COMPONENT_SET, one row per genuine standalone COMPONENT.

### Confirmed

- The REST `/components` endpoint response fields, verified against a live Figma file: `key, file_key, node_id, thumbnail_url, name, description, description_rt, created_at, updated_at, containing_frame, user`. No `componentSetId`, no `component_set_id`. The deduplication has to come from elsewhere.

## [6.2.0] — 2026-05-11

The REST extractor now produces a metadata-complete `components.json` matching what the MCP path emits. Variant counts and component-property definitions (BOOLEAN / TEXT / INSTANCE_SWAP / VARIANT) are populated from Figma, so the compiler's variant validator works against KBs that were refreshed by the cron — previously, REST-extracted KBs had empty `properties` and the validator silently accepted every variant, masking authoring errors.

### Added

- **2-pass component extraction.** `extractComponentsFromFigma` now calls `/v1/files/{key}/components`, `/v1/files/{key}/component_sets`, and `/v1/files/{key}/nodes?ids=...&depth=1` in concert. The third request batches all component-set node IDs (50 per request) and pulls `componentPropertyDefinitions` so the on-disk shape is record-style (e.g. `{ "size": "VARIANT(large,medium,small)" }`) and matches the compiler's runtime expectations in `lib/compiler/resolve.ts`.
- **Standalone components are emitted alongside component sets**, filtered via `component_set_id` so variant instances inside a set don't pollute the registry.
- **Variant count** (`variants: number`) and `id` / `page` fields on each entry — parity with the MCP-extracted KB shape that Bridge teams already rely on.

### Why

The previous REST extractor wrote `properties: []` and `variants: []` because `/components` alone doesn't expose property definitions. The compiler's variant validator (`validateVariants` in `resolve.ts`) reads `entry.properties[key]` as a record of string-encoded type tags — when properties was an empty array, the read silently returned undefined and every variant was accepted as valid. Cron-managed KBs were effectively bypassing validation. v6.2.0 closes that gap: the cron now produces the same shape as the MCP path, and validation works end-to-end.

### Compatibility

The new output is the same shape as the existing MCP-extracted `components.json` files (record-style `properties`, numeric `variants` count, `id` / `page` fields). KBs created with v6.1.x will be overwritten with the richer shape on the next cron run; downstream consumers that only read `key` / `name` are unaffected.

The Figma REST endpoints used (`/components`, `/component_sets`, `/files/{key}/nodes`) are all Tier 1 / Tier 3 and available on every plan — not Enterprise-gated. Rate limits remain comfortably within daily-cron headroom (Tier 1 = 20/min, Tier 3 = 150/min; the extractor uses 3 requests per file, plus one `/nodes` batch per 50 component sets).

## [6.1.1] — 2026-05-11

Graceful degradation when the Figma variables endpoint is gated by plan tier. Non-Enterprise teams can now run the cron without it failing — variables stay refreshed manually via MCP, components and text styles continue to refresh automatically.

### Fixed

- **403/404 on `/variables/local` no longer fails the cron.** The orchestrator catches `VariablesEndpointUnavailableError` (new typed sentinel), preserves the existing `variables.json` on disk, and continues with the other registries. The sync report now lists skipped registries with reasons.
- **`runCron` return value** gains a `skips: { registry, reason }[]` array.

### Why

The Figma REST endpoint `/files/{key}/variables/local` is Enterprise-only. Non-Enterprise tokens get a 403, which previously crashed the whole cron run before it could refresh components or text styles. The MCP path (used by the `extracting-design-system` skill in interactive setup) is unaffected — it goes through the Plugin API, which exposes variables on all plans. So the right behaviour for the cron is to extract what it can and leave the rest to a manual MCP refresh.

## [6.1.0] — 2026-05-11

Multi-file KB sync. The cron now supports a design system split across several Figma library files — common for teams that publish a "Foundations" library (variables + text styles) separately from a "Components" library.

### Added

- **`figmaFiles` config block** (optional) — per-category file key overrides. Categories: `components`, `variables`, `textStyles`. Any omitted key falls back to the top-level `figmaFileKey`.
- **`resolveFileKey(cfg, category)` helper** in `lib/config/kb-config.ts` for consumers that need the same resolution logic.
- **Per-category extractor functions** in `lib/extractors/figma-rest.ts`: `extractComponentsFromFigma`, `extractVariablesFromFigma`, `extractTextStylesFromFigma`. Each hits exactly one REST endpoint.
- **Sync report now lists source file per registry** — `.bridge/last-sync-report.md` shows which Figma file each registry was extracted from.

### Changed

- **Cron orchestrator** routes per-registry instead of single-file. `extractFromFigma` is preserved as a convenience wrapper that calls the three per-category extractors in parallel against the same fileKey.
- **`runCron` return value** now includes a `writes: { registry, fileKey }[]` array so consumers can audit which file fed each registry.

### Backward compatibility

Existing configs with only `figmaFileKey` work unchanged — `figmaFiles` defaults to `{}` and every category falls back to the primary key. No migration needed.

### Scope note

Asset registries (`icons.json`, `logos.json`, `illustrations.json`) remain outside the cron because their schema is consumer-specific (no upstream contract). Teams using assets keep refreshing them manually via the `extracting-design-system` skill.

## [6.0.0] — 2026-04-17

Deliberate cleanup release. Cuts the unfulfilled docs subsystem, reframes cron as a KB-freshness mechanism, and tightens skills with superpowers-style discipline patterns. See [BREAKING.md](BREAKING.md) for the migration guide and [docs/v6-cleanup-audit.md](docs/v6-cleanup-audit.md) for the full audit reasoning.

### BREAKING

- **Removed entire docs subsystem** (`bridge-ds docs build/sync/check/mcp` commands, `lib/docs/` tree, `generating-ds-docs` skill, Handlebars dependency). Why: produced empty boilerplate — CSpecs were never wired through the generator.
- **Removed `init-docs` CLI** (deprecated v4.1, duplicate of `setup`).
- **Removed `init` + `update` deprecation stubs** (v5.0 residue).
- **Setup scaffold no longer creates `design-system/` tree**, `llms.txt`, or `.bridge/mcp.json`. Config YAML no longer has `docsPath` field.
- **Cron workflow now uses `npx -y @noemuch/bridge-ds@<VERSION>`** instead of `npm install && npm run build` in consumer repos (fixes #15).

### Added

- **`<IRON-LAW>` markers** in `using-bridge` SKILL and `compiler-reference.md`.
- **Evidence-before-claims discipline** in `references/verification-gates.md`.
- **4 graphviz decision diagrams** (`make`, `fix`, `done`, CSpec pipeline).
- **`.cursor-plugin/marketplace.json`** (was missing).

### Changed

- **`shipping-and-archiving` skill** no longer cascades to docs sync.
- **`extracting-design-system` skill** no longer triggers initial docs build.
- **Skills reduced from 6 to 5.** CLI commands from 13 to 8 active.
- **`lib/kb/index-builder.ts` removed** (was docs-only consumer).

---

## [5.1.0] — 2026-04-16

KB schema versioning + guided migration. Consumer repos with a pre-v5 KB
(grouped-by-category `components.json`) now fail fast with a clear
pointer to `bridge-ds migrate` instead of cryptic downstream errors.

### Added
- **KB schema versioning (`lib/kb/schema-version.ts`)** — every KB read asserts compatibility via `assertKBCompatible`. Legacy grouped-by-category KBs fail fast with a structured `KBSchemaError` pointing at `bridge-ds migrate`.
- **`bridge-ds migrate` CLI command** — auto-detects legacy KB shapes and converts them to schema v1 (flat arrays, stamped `version` and `generatedAt` across `components`, `variables`, `text-styles`, and assets `icons` / `logos` / `illustrations` when present). No-op on already-current KBs; refuses KBs written by a newer CLI.
- **Legacy-to-v1 migration (`lib/kb/migrations/legacy-to-v1.ts`)** — flattens pre-v5 grouped `components.json` into the flat v1 shape used by the rest of the codebase.

### Changed
- Compiler registry (`loadRegistry`) rewritten to read the v1 flat-array schema at the canonical `knowledge-base/registries/` path, matching the layout produced by extraction and consumed by docs generation. Resolves a latent path inconsistency. **Breaking for direct programmatic consumers of `loadRegistry` via the `./compiler` export** — CLI behavior is unchanged.
- Test discovery script (`package.json#test:all`) now walks `dist/lib` and `dist/test` recursively via `node --test`, catching test files at deeper paths. Previous glob pattern missed subdirectory tests.

### Fixed
- (none — this release is additive + latent-bug resolution; no CLI regressions)

## [5.0.0] — 2026-04-16

Major cleanup + pro-grade tooling release. The skill workflow (`make`,
`fix`, `done`, `setup bridge`, `docs`) is unchanged — v5.0.0 is about
the foundations: TypeScript everywhere, zero `any` in production, a
strict lint/format/typecheck pipeline, an automated release, and a
repo free of dead code and dogfood cruft.

### Upgrading from v4.x

```bash
npm install @noemuch/bridge-ds@5
# or, if you installed the plugin:
# /plugin update bridge-ds   (in Claude Code)
```

If your code imports Bridge programmatically, swap any direct source
references for the package entry:

```js
import { main, VERSION } from "@noemuch/bridge-ds";
import { compile } from "@noemuch/bridge-ds/compiler";
```

The skill flow (`setup bridge`, `make`, `fix`, `done`, `docs`) is
unchanged. Knowledge-base format, scene-graph schema, MCP URIs, and the
scaffolded cron workflow are all backwards-compatible — no state to
migrate.

**Rollback:** `npm install @noemuch/bridge-ds@4.1.0`. v5.0.0 does not
touch your knowledge base or generated docs.

### Breaking changes

- **Minimum Node.js bumped to 20 LTS** (`engines.node: ">=20"`). Node
  18 reached maintenance-only status and is incompatible with ESM-only
  dependencies we now rely on (`@clack/prompts@1.2`). Node 20 and 22 are
  supported.
- **`bridge-ds init` and `bridge-ds update` CLI commands removed.** The
  legacy interactive wizard retired in favour of `setup bridge` in
  Claude Code (single-entry flow). Typing `init`/`update` now prints a
  deprecation notice pointing to the supported path.
- **Package entrypoints repointed at compiled output.** `package.json`
  `main`/`types`/`exports` now resolve to `dist/lib/cli/main.js` (and
  `./compiler` → `dist/lib/compiler/compile.js`). Consumers that
  imported source paths directly must switch to the `@noemuch/bridge-ds`
  package entry or `@noemuch/bridge-ds/compiler`.
- **`commands/` slash-command directory dropped.** The only file in it
  (`design-workflow.md`) referenced a skill removed in v3.3. The
  directory is gone, and `commands` entries removed from
  `package.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`.
- **`figlet` and `ajv` + `ajv-formats` dependencies removed.** `figlet`
  replaced by an inlined ANSI banner; `ajv` was unused in-tree (Zod
  covers config validation).
- **Compiler source is TypeScript.** Any consumer requiring
  `./lib/compiler/compile.js` directly will break — use the public
  `@noemuch/bridge-ds/compiler` entry or `dist/lib/compiler/compile.js`.

### Added

- **Compiler migration to strict TypeScript** (`lib/compiler/*.js` →
  `lib/compiler/*.ts`). Public API unchanged. New
  `lib/compiler/types.ts` exposes `SceneGraph`, `SceneNode`,
  `ResolvedSceneGraph`, `ResolvedToken`, `ImportBundle`, `Chunk`,
  `CompileOptions`, `CompileResult`, `CompilerError`, `ErrorCode`.
- **Compiler regression test suite** (`lib/compiler/compile.test.ts`):
  success path, unknown-token resolve error, `official` transport
  missing fileKey, malformed JSON input.
- **Bridge Docs CLI `bridge-ds compile`** — official public entry point
  for the compiler pipeline. Previously buried at
  `node lib/compiler/compile.js`.
- **Hardening (security):**
  - MCP server (`lib/docs/mcp-server.ts`) restricts `ds://` URI names to
    `[A-Za-z0-9_-]+` and asserts the resolved path stays inside
    `docsPath` — `ds://component/..` now rejected.
  - YAML config parsing (`lib/config/docs-config.ts`) locked to
    `JSON_SCHEMA` — custom tags (`!!js/function`, etc.) rejected at
    parse time.
  - Handlebars `provenanceMarker`/`manualRegion` helpers sanitise inputs
    to a safe alphabet; dropped the `globalThis.__bridgeHandlebars`
    escape hatch.
- **ESLint 9 (flat config) + Prettier 3.** Run `npm run lint`,
  `npm run format`, `npm run format:check`, `npm run typecheck` locally.
- **Release pipeline** `.github/workflows/release.yml`: tagged pushes
  (`vX.Y.Z`) trigger typecheck + build + lint + tests + `npm publish
  --provenance`. Verifies the tag matches `package.json`.
- **CI refactor**: lint-typecheck + full-test-suite jobs separated,
  `cache: "npm"` enabled on every job, dropped the stale legacy-compiler
  require.
- **`scripts/bump-version.js`**: sync version across `package.json`,
  the three plugin manifests, and `lib/cli/main.ts` VERSION in one
  shot.
- **`scripts/validate-skills.js`**: auto-discovers skills via `readdir`
  instead of a hard-coded list; still flags dead paths.
- **+19 tests** across `lib/cli/main.test.ts` (8), `lib/cli/setup-orchestrator.test.ts` (6),
  `lib/cron/orchestrator.test.ts` (+1 integration), `lib/config/docs-config.test.ts` (+1),
  `lib/docs/mcp-server.test.ts` (+2), plus the compiler suite.
- `.nvmrc` (`20`), `.npmignore`, `.prettierrc.json`, `.prettierignore`.

### Changed

- `package.json` scripts: `typecheck`, `lint`, `format`, `format:check`,
  `version:sync`, `test:smoke`. `prepublishOnly` hardened to run
  typecheck + build + lint + test:skills + test:security.
- `@clack/prompts` bumped `0.7.x` → `1.2.x`.
- Doc overhaul: `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, and all
  skill markdown files refreshed for the v5 reality (TS compiler, 6
  skills, no `/design-workflow`). `MIGRATION.md` adds the v4.x → v5.0.0
  section.
- `tsconfig.json`: removed the now-obsolete `"lib/**/*.js"` exclusion.

### Removed / cleanup

- **Dead code pass**: `lib/extractors/figma-mcp.ts` (stub that only
  threw), `lib/cli/progress-reporter.ts` + `reporter` field on
  `SetupOrchestratorOptions` (class never called outside its own test),
  `references/schemas/*.json` (4 JSON Schemas not wired to any
  runtime — the real contracts live in `lib/docs/linter.ts` and Zod),
  and 6 stale `.gitkeep` markers.
- **`MIGRATION.md`**: merged into the CHANGELOG as
  `### Upgrading from vX` subsections under the major-version entries.
- **Dogfood cruft** (21 files, ~72 KB): `docs.config.yaml`, `.bridge/`,
  `bridge-ds/knowledge-base/*`, `design-system/*`, `llms.txt`. Bridge is
  a CLI tool, not a real DS; the template for *user* repos still lives
  inside `lib/cli/setup-orchestrator.ts`.
- Orphan `.github/workflows/bridge-docs-cron.yml` (daily cron on
  Bridge's own repo with no `FIGMA_TOKEN` — it was failing every
  morning since v4.0.0).
- Legacy CLI layer: `lib/cli.js`, `lib/scaffold.js`, `lib/mcp-setup.js`
  (~390 LOC). `bin/bridge.js` now routes every command through
  `dist/lib/cli/main.js`.
- `lib/compiler/SPEC.md` (1498 lines of obsolete CommonJS
  implementation spec).
- `commands/` directory and its dead `design-workflow.md`.
- All explicit `any` in production code (23 occurrences). Replaced with
  narrow types (`FigmaExtractResult`, `LearningsFile`/`RecipesFile`,
  `CheckReport`, Handlebars context shapes).

### Notes on stability

- 76/76 tests pass.
- Zero ESLint errors and warnings in production code (`any` allowed in
  test fixtures only, via an explicit override).
- Zero Prettier diffs (`format:check` green).
- Full CI matrix green on Node 18, 20, 22.

## [4.1.0] — 2026-04-15

### Added
- `@noemuch/bridge-ds` published to npm (first real publication; v4.0.0
  was GitHub-only).
- Per-component `.llm.txt` sidecars for ultra-compressed LLM consumption
  (shadcn/ui pattern). Generated alongside `.md` + `.json` via the new
  `lib/docs/generators/llm-txt.ts` module and the
  `lib/docs/templates/component.llm.txt.hbs` Handlebars template.
- SessionStart hook emits a live health status line
  (`◆ Bridge: KB synced 2h ago · N components`) appended to
  `hooks/session-start`'s `additionalContext`.
- Auto-detection of git remote (via `.git/config`) and Figma URL
  (via README.md / CLAUDE.md / package.json) — `lib/kb/auto-detect.ts`.
- Progress reporter (`lib/cli/progress-reporter.ts`) emitting
  `[progress]` JSON event lines during multi-minute MCP extract.
- Setup orchestrator `lib/cli/setup-orchestrator.ts` — shared module
  used by the `extracting-design-system` skill (via Bash) for
  pre-flight + scaffold + token-storage.
- `bridge-ds setup` CLI subcommand — headless scaffold dispatch for the
  skill. Flags: `--ds-name`, `--figma-key`, `--docs-path`, `--kb-path`.
- `SECURITY.md` with disclosure policy, scope minimization notes, and
  supply-chain guidance.
- One-page v4.0.0 → v4.1.0 upgrade notes (previously a separate
  `MIGRATION.md`, folded into this changelog in v5.0.0).
- Token-handling module `lib/cli/token-handling.ts` — stdin-only pipe
  to `gh secret set`, `maskToken` for safe logging, `validateFigmaToken`
  against `/v1/me`, `probeVariablesEndpoint` for Enterprise-plan probing.
- `npm run test:security` + `npm run test:all` + `prepublishOnly`
  scripts; security test suite at `test/security/token-leak.test.ts`.
- New CI jobs (added in F2): `security` (token-leak regression + grep
  `dist/` scan) and `integration-smoke` (headless scaffold in temp dir).

### Changed
- `extracting-design-system` skill absorbs scaffolding responsibilities.
  `setup bridge` in Claude Code is now the single-entry-point flow
  (replaces the legacy CLI wizard as the recommended path).
- Token handling rewritten: stdin-only paste, direct pipe to
  `gh secret set` via `spawn` stdio `pipe`. Token never enters
  `process.env`, `argv`, shell history, or log files. Token values
  logged as `figd_***<last4>`.
- README repositioned: compiler-first lead, docs as a secondary
  audience-specific section with For designers / For DS teams /
  For engineers.
- `using-bridge` command map expanded with "setup bridge", "bootstrap",
  "initialize" keywords routing to `extracting-design-system`.
- `lib/docs/generate.ts`: first-run regen logic formalized (inverted
  ternary fixed, regression tests added).

### Fixed
- `lib/docs/generate.ts` first-run: previously returned empty
  `regenerated` list on a fresh KB due to inverted ternary in the
  "fake old snapshot" logic. Now correctly triggers full regen on
  first run. Locked in by 2 new regression tests.

### Security
- FIGMA_TOKEN handling rewritten: stdin-only pipe to `gh secret set`
  eliminates five leak surfaces (env, argv, ps-visible args, shell
  history, log files).
- Graceful fallback on Figma REST `/variables/local` 403 for
  non-Enterprise plans (cron proceeds with components + text styles
  only, logs warning).
- `SECURITY.md` added with disclosure policy and scope-minimization
  notes.

### Deprecated
- `bridge-ds init-docs` CLI wizard emits DeprecationWarning on startup.
  Still functional (legacy contract preserved for v4.x). Removal
  planned for v5.0.0. Migrate to `setup bridge` in Claude Code.

## [4.0.0] — 2026-04-15

### Added
- **Bridge Docs V0.1** — complete docs generation pipeline.
- **`generating-ds-docs` skill** (6 modes: init / full-build / sync / check / mcp / headless-sync).
- **TypeScript build** (`tsc` → `dist/`); existing JS untouched.
- **REST extractor** `lib/extractors/figma-rest.ts` — headless Figma extraction via `FIGMA_TOKEN`.
- **KB layer** `lib/kb/{hash,registry-io,index-builder}.ts`.
- **6 Handlebars templates** (component / foundation / pattern / changelog / migration / llms.txt) + shared helpers + renderer.
- **Cascade engine** `lib/docs/cascade/{diff-engine,impact-analyzer,regen-planner,rename-detector}.ts`.
- **Preservation layer** `lib/docs/preservation.ts` — inline `<!-- manual:id -->` regions preserved across regens.
- **Linter** `lib/docs/linter.ts` — frontmatter required fields + token ref resolution + Figma deeplink shape.
- **Orchestrator** `lib/docs/generate.ts` — build / sync / check.
- **MCP server** `lib/docs/mcp-server.ts` — local stdio server exposing `ds://component/<name>`, `ds://foundation/<name>`, `ds://index`.
- **Cron** `lib/cron/orchestrator.ts` + `.github/workflows/bridge-docs-cron.yml` — daily Figma REST extract + docs sync + PR on diff.
- **CLI** — `bridge-ds init-docs` wizard (@clack/prompts + figlet), `doctor`, `extract --headless`, `docs {build,sync,check,mcp}`, `cron`. Single-bin router (`bin/bridge.js`) dispatches legacy + V4 commands.
- **JSON Schemas** under `references/schemas/` for component / foundation / pattern frontmatter and `_index.json`.
- **Dogfood** — Bridge's own repo uses Bridge Docs to document its 6 skills.

### Changed
- `shipping-and-archiving` cascades to `generating-ds-docs sync` on done.
- `using-bridge` command map includes the `docs` keyword; description frontmatter updated.

### Removed
- `skills/design-workflow/` compatibility shim (Phase 4 of restructure). Legacy `/design-workflow <command>` invocations no longer route.

### Notes
- Tier 1 CLI entry: `npx @noemuch/bridge-ds init-docs`.
- Node 18+ required.
- `skills/generating-ds-docs/` integrates interactively via Claude Code and non-interactively via the cron.

## [3.3.0] — 2026-04-15

### Changed
- **Skill architecture restructure.** The monolithic
  `skills/design-workflow/SKILL.md` has been split into four focused
  action skills — `generating-figma-design`, `learning-from-corrections`,
  `shipping-and-archiving`, `extracting-design-system` — plus the
  existing force-loaded `using-bridge` process skill. The `drop` action
  folds into `using-bridge` (too small to warrant its own skill). The
  `using-bridge` command map routes directly at the new action skills.
- **Shared references lifted to repo root** at `references/`:
  `compiler-reference.md`, `transport-adapter.md`,
  `verification-gates.md` (replaces the phase-oriented `quality-gates.md`
  with a gate-oriented A/B/C contract), and
  `red-flags-catalog.md` (new).
- **CSpec templates** moved to
  `skills/generating-figma-design/references/templates/`.

### Added
- **`scripts/validate-skills.js`** — CI-integrated validation harness
  checking frontmatter, required sections, shared references, and
  shim size. Added to the CI workflow as a dedicated step.
- **`references/verification-gates.md`** — canonical A/B/C gates
  contract replacing the phase-oriented `quality-gates.md`.
- **`references/red-flags-catalog.md`** — shared rationalization →
  reality table consumed by every action skill.

### Deprecated
- `skills/design-workflow/SKILL.md` is now a 27-line compatibility shim.
  All legacy action files under `skills/design-workflow/references/actions/`
  have been deleted. The shim will be removed in v4.0.0.

### Notes
- **No behavior change.** All `/design-workflow <command>` invocations
  continue to work via the `using-bridge` command map.
- The `knowledge-base/` directory layout is unchanged.

## [3.2.2] — 2026-04-15

### Changed
- Plugin manifest versions aligned at `3.2.2` across `package.json`,
  `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and
  `.cursor-plugin/plugin.json` (resolves prior version drift).
- `skills/design-workflow/SKILL.md` frontmatter updated to
  `name: design-workflow` / `version: 3.2.2`.

### Fixed
- README: corrected Figma Desktop plugin import instructions (point to
  the `figma-console-mcp` manifest rather than a non-existent file).
- README: documented the `specs/backlog/` directory created by
  `bridge-ds init`.

## [3.2.0] — 2026-04-15

### Added
- **`skills/using-bridge/`** — Force-loaded process-layer skill (~400 tokens) owning Bridge's discipline, command map, non-negotiable hard rules, and Red Flags rationalization catalog. Injected at every Claude Code session via the SessionStart hook.
- **`hooks/session-start`** — POSIX shell script that strips YAML frontmatter from `skills/using-bridge/SKILL.md` and emits the Claude Code SessionStart JSON payload.
- **`hooks/hooks.json`** — Claude Code hook registration; binds `session-start` to the SessionStart event so `using-bridge` is injected automatically.
- **`<HARD-GATE>` block** in `skills/design-workflow/SKILL.md` — Five non-negotiable rules enforced prompt-side: no raw Plugin API code, no hardcoded primitives, no ship without compiler+screenshot+user-confirmation, never read `figma-api-rules.md`, never reuse nodeIds across sessions.
- **Red Flags rationalization table** in `skills/design-workflow/SKILL.md` — Eight common rationalizations with reality counters (hardcode shortcuts, compiler skepticism, screenshot skipping, stale nodeId memory, forbidden API reads, user-approval workarounds, raw Plugin API reuse, inline scripting).

### Changed
- **`skills/design-workflow/SKILL.md` description** rewritten as triggers-only (per `obra/superpowers` research — workflow-summary descriptions cause LLM shortcutting).
- **Action Router slimmed** in `skills/design-workflow/SKILL.md` — keyword→action routing delegated to `skills/using-bridge/SKILL.md`; design-workflow retains the minimal action→file map for self-sufficiency when invoked directly (~40 lines saved).
- **`package.json` + `.claude-plugin/plugin.json`** version aligned at `3.2.0` (fixes pre-existing drift from `3.1.0` / `3.0.1`).
- **`package.json` `files` array** now includes `hooks/` for npm distribution.

### Notes

No breaking changes.

## [3.1.0] — 2026-04-03

### Added
- **Declarative setup steps** — SKILL.md now includes `setup:` array with typed steps for bridge-app's Setup Engine
- **Manifest extensions** — `requires`, `priority_references`, `generation_phases`, `readiness` in SKILL.md frontmatter
- **Readiness checks** — `figma-connected` (mcp_tool) and `knowledge-base` (kb_populated)

## [3.0.1] — 2026-03-29

### Fixed
- Compiler: `CompilerError` now extends `Error` for proper catch/stack traces
- Compiler: fixed ~28 broken constructor calls in schema validation
- Compiler: aligned validation severity with push destinations (errors vs warnings)
- Compiler: added try/catch around wrap stage to prevent uncaught throws
- Compiler: removed dead code (unused import, no-op function, dead concat)
- Docs: replaced all stale v2 terminology (`learn`→`fix`, `spec`→`make`, `PASS review`→`<= 2 corrections`)
- CLI: removed obsolete `learn` command from help text

## [3.0.0] — 2026-03-28

### Breaking
- Complete architecture rewrite: compiler-driven generation replaces manual Plugin API scripting
- Command restructure: `make`/`fix`/`done` replace `spec`/`design`/`review`/`quick`/`sync`/`learn`
- Spec format: CSpec YAML replaces markdown templates
- Removed: `figma-api-rules.md` (rules now enforced by compiler), `bundle.js`, old action files

### Added
- **Scene Graph Compiler** (`lib/compiler/`): declarative JSON to correct Figma Plugin API scripts
  - 26 Figma API rules enforced automatically by code generation
  - Token/component resolution with fuzzy error suggestions
  - Multi-chunk support with globalThis bridging
  - Transport-aware output (console IIFE vs official top-level await)
  - Compile-time validation (catches errors before Figma execution)
- **CSpec format**: YAML-based compilable specifications (human-readable + machine-parseable)
- **Recipe system**: pre-built scene graph templates that evolve with user corrections
- **Unified `make` command**: spec + design + review in one continuous flow
- **`fix` command**: snapshot diff, learning extraction, recipe auto-patching
- **Compiler reference**: concise 2.5K-token reference replaces 13K-token rules document

### Removed
- `figma-api-rules.md` — rules moved into compiler internals
- `bundle.js` — replaced by compiler
- `spec.md`, `design.md`, `review.md`, `quick.md`, `sync.md` — replaced by `make.md`
- `spec-template.md`, `screen-template.md` — replaced by CSpec YAML templates
- `onboarding.md` — replaced by `setup.md`

## [2.5.1] — 2026-03-25

### Added
- **Rule 24**: Never screenshot a page or empty node — create a frame first
- **Rule 25**: Input/Select components — swap to `state=filled` for real values
- **Rule 26**: Validate registry keys before writing scripts — copy-paste from registries, never type manually
- `quick.md`: References Rules 24-26 in generation steps

## [2.5.0] — 2026-03-25

### Added
- **Dual MCP transport**: Support for both figma-console-mcp (preferred) and official Figma MCP server (fallback). Auto-detection picks the best available transport.
- **Express mode**: `/design-workflow quick` skips formal spec, generates from brief description with 2 questions max. Same DS quality guarantees.
- **Plugin packaging**: `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` for marketplace distribution.
- **Transport adapter**: `transport-adapter.md` — central reference for tool mapping, script adaptation, and composite DS extraction.
- **Rule 23**: Transport-aware scripting in `figma-api-rules.md` (IIFE vs top-level await, official transport constraints).
- **KB path resolution**: `./bridge-ds/` (plugin mode) or `.claude/skills/` (npm scaffold mode).
- **`.mcp.json`**: MCP server dependency declaration for plugin installs.

### Changed
- `mcp-setup.js`: Returns `{ console, official }` instead of boolean.
- `cli.js`: Reports both transports during init, offers dual setup instructions.
- `onboarding.md`: Dual transport detection + composite DS extraction for official transport.
- `quality-gates.md`: Quick mode section with relaxed gates (pattern matching best-effort, no formal spec/review).
- 6 schema files updated with transport notes.
- `package.json`: Bumped to v2.5.0, added plugin manifests to `files`.

## [2.4.1] — 2026-03-20

### Fixed
- **review.md**: Sections F (Component API Quality) and G (Learning Opportunity) were in wrong order
- **CLI help**: Added missing `drop`, `learn`, `sync`, `status` slash commands
- **README.md**: Added missing `learn` and `sync` commands to table; updated workflow diagram with learning loop
- **design.md**: Fixed incorrect absolute path to knowledge base (now relative `references/knowledge-base/`)
- **done.md**: Added `Learnings: {n} persisted` to output template
- **scaffold.js**: Added `learnings.json` to `.gitignore` entries; `update()` now preserves `learnings.json`

### Added
- **Templates**: "Known Preferences" section in both `screen-template.md` and `spec-template.md`
- **CHANGELOG.md**: This file

## [2.4.0] — 2026-03-19

### Added
- Learning loop: `learn` action diffs Figma corrections against generation snapshot, extracts reusable preferences
- Incremental DS sync: `sync` action updates registries without full re-setup
- `status` action shows current workflow state and suggests next step
- `drop` action abandons work with preserved learnings
- Snapshot capture after design generation for learn diffing

## [2.3.0] — 2026-03-18

### Added
- Screen generation with reference inspection and clone-first strategy
- Auto-enrichment of specs from knowledge base
- Visual reference pattern matching (blocking gate)

## [2.2.0] — 2026-03-17

### Added
- `update` command to preserve knowledge base on upgrades
- Interactive MCP setup during `init`

## [2.1.0] — 2026-03-16

### Added
- Registry schemas and validation for setup
- Validation gate before design generation

## [2.0.1] — 2026-03-15

### Fixed
- Strengthened pre-script audit
- Added Rule 20 (setTextStyleIdAsync)

## [2.0.0] — 2026-03-14

### Changed
- Complete rewrite: MCP-powered design workflow via figma-console-mcp
- Spec-first architecture with atomic generation
- Knowledge base system (registries, guides, patterns)
- DS-native generation (zero hardcoded values)

## [1.0.0] — 2026-03-12

### Added
- Initial release: Bridge for Claude Code
- CLI with `init` command
- Design workflow skill scaffold
