# Changelog

All notable changes to Bridge DS are documented here.

## [3.2.0] — (Unreleased)

### Added
- **Hard Rules section** in `SKILL.md` — Five non-negotiable rules enforced prompt-side:
  - No raw Plugin API code (use compiler)
  - No hardcoded primitives (use semantic tokens)
  - No 'done' without compiler+screenshot+user-confirmation
  - Never read `figma-api-rules.md` (compiler handles everything)
  - Never reuse nodeIds across sessions
- **Red Flags rationalization table** in `SKILL.md` — Eight common rationalizations with reality counters (hardcode shortcuts, compiler skepticism, screenshot skipping, stale nodeId memory, forbidden API reads, user-approval workarounds, raw Plugin API reuse, inline scripting)
- **`skills/using-bridge/SKILL.md`** — new force-loaded process-layer skill (~400 tokens) owning Bridge's discipline, command map, hard rules, and red-flags catalog; will be auto-injected at every session via SessionStart hook (Task 6)

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
