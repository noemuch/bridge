# Changelog

All notable changes to Bridge DS are documented here.

## [Unreleased] — v4.0.0 Bridge Docs V0.1 (in progress)

### Added
- TypeScript build infrastructure scaffolded for Bridge Docs V0.1
  (`tsconfig.json`, `tsc` → `dist/`, strict mode, NodeNext modules).
  New runtime deps (`handlebars`, `picocolors`, `figlet`,
  `@clack/prompts`, `zod`, `@modelcontextprotocol/sdk`, `ajv`,
  `ajv-formats`, `js-yaml`) and dev deps (`typescript`, `@types/node`,
  `@types/figlet`, `@types/handlebars`, `@types/js-yaml`). Placeholder
  directories under `lib/` for `cli/`, `extractors/`, `kb/`,
  `docs/{generators,cascade,templates}/`, `cron/`. CI gains a
  `TypeScript build` step. Existing JS codebase (`lib/compiler/*.js`,
  `lib/cli.js`, `bin/bridge.js`) is untouched and keeps working.
- `lib/kb/hash.ts` — deterministic SHA256 over KB artifacts.
- `lib/kb/registry-io.ts` — typed registry reader/writer with shape validation.
- `lib/kb/index-builder.ts` — `_index.json` relationship graph (buildFromScratch + patch).
- `lib/extractors/figma-rest.ts` — Figma REST API headless extractor (variables + components + text styles).
- `lib/extractors/figma-mcp.ts` — interactive MCP extraction contract (throws with guidance for V0.1).
- `lib/config/docs-config.ts` — Zod-validated `docs.config.yaml` parser.

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
