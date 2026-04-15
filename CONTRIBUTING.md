# Contributing to Bridge

Thanks for your interest in contributing. Bridge is open source and welcomes contributions of all kinds — bug fixes, new features, documentation improvements, and recipe experiments.

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bridge.git
   cd bridge && npm install
   ```
3. Link the CLI locally to test changes end-to-end:
   ```bash
   npm link
   bridge-ds help
   ```
4. Point a scratch project at your local checkout:
   ```bash
   cd /path/to/scratch-project
   bridge-ds init
   ```

## Development Guidelines

**Node.js 18+** everywhere. No transpile step — the codebase is plain JS with explicit imports.

**Compiler is the only path.** Bridge's core guarantee is that every Figma output goes through `lib/compiler/compile.js`. Do not add workflows that emit raw Plugin API code — this breaks the design system compliance guarantee.

**Semantic tokens only.** No hardcoded primitives in generated output. Every value must resolve to a DS token (`$color/...`, `$spacing/...`, `$text/...`, `$comp/...`).

**No breaking scene graph schema changes** without a matching compiler version bump and a migration note in `CHANGELOG.md`. The schema is the contract between the LLM and the compiler.

**English for generated artifacts.** Knowledge base files, CSpecs, guides, learnings, recipes, scene graphs — English only. Conversation with users can happen in any language; artifacts cannot.

**Run the compiler smoke test** before every PR:
```bash
node bin/bridge.js help
node lib/compiler/compile.js --help
```

## Pull Requests

- Keep PRs focused. One feature or fix per PR.
- Write a clear description of what changed and why.
- Update `CHANGELOG.md` with an entry under `## [Unreleased]`.
- Update `CLAUDE.md` if you changed architecture, commands, or skill structure.
- Update `README.md` if you changed user-visible behavior, commands, or prerequisites.
- Ensure CI passes.

## Project Structure

See [`CLAUDE.md`](CLAUDE.md) for the full architecture guide, compiler pipeline, transport adapter, and skill-layer overview.

Key entry points:

- `lib/compiler/compile.js` — scene graph → Plugin API pipeline
- `skills/using-bridge/SKILL.md` — force-loaded process-layer skill
- `skills/design-workflow/SKILL.md` — action-layer skill
- `skills/design-workflow/references/actions/` — per-command logic

## Community

- [Discussions](https://github.com/noemuch/bridge/discussions) — questions, ideas, show & tell
- [Issues](https://github.com/noemuch/bridge/issues) — bug reports, feature requests

## Code of Conduct

Be respectful. Be constructive. We're building something interesting together.
