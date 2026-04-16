# Contributing to Bridge

Thanks for your interest in contributing. Bridge is open source and welcomes contributions of all kinds — bug fixes, new features, documentation improvements, and recipe experiments.

## Getting Started

1. Fork the repository
2. Clone your fork and install dependencies:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bridge.git
   cd bridge && npm install
   ```
3. Build the TypeScript sources:
   ```bash
   npm run build
   ```
4. Link the CLI locally to test changes end-to-end:
   ```bash
   npm link
   bridge-ds help
   ```

## Development guidelines

**Node.js 18+** everywhere. The codebase is **TypeScript (strict mode)**, compiled to `dist/` via `tsc`. Rebuild after any source change (`npm run build` or `npm run build:watch`).

**Compiler is the only path.** Bridge's core guarantee is that every Figma output goes through `lib/compiler/compile.ts`. Do not add workflows that emit raw Plugin API code — this breaks the design system compliance guarantee.

**Semantic tokens only.** No hardcoded primitives in generated output. Every value must resolve to a DS token (`$color/...`, `$spacing/...`, `$text/...`, `$comp/...`).

**No breaking scene graph schema changes** without a matching compiler version bump and a migration note in `CHANGELOG.md`. The schema is the contract between the LLM and the compiler.

**English for generated artifacts.** Knowledge base files, CSpecs, guides, learnings, recipes, scene graphs — English only. Conversation with users can happen in any language; artifacts cannot.

## Before sending a PR

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format:check # prettier
npm run test:all    # build + run all tests
npm run test:skills # skill frontmatter + references validation
```

CI runs the same checks — get them green locally first.

## Pull requests

- Keep PRs focused. One feature or fix per PR.
- Write a clear description of what changed and why.
- Update `CHANGELOG.md` with an entry under `## [Unreleased]`.
- Update `CLAUDE.md` if you changed architecture, commands, or skill structure.
- Update `README.md` if you changed user-visible behavior, commands, or prerequisites.
- Ensure CI passes.

## Project structure

See [`CLAUDE.md`](CLAUDE.md) for the full architecture guide, compiler pipeline, transport adapter, and skill-layer overview.

Key entry points:

- `lib/compiler/compile.ts` — scene graph → Plugin API pipeline
- `lib/cli/main.ts` — CLI router (all commands)
- `lib/cli/setup-orchestrator.ts` — headless scaffolding invoked by `setup bridge`
- `skills/using-bridge/SKILL.md` — force-loaded process-layer skill
- `skills/*/SKILL.md` — one skill per action (`make`, `fix`, `done`, `setup`, `docs`)

## Community

- [Discussions](https://github.com/noemuch/bridge/discussions) — questions, ideas, show & tell
- [Issues](https://github.com/noemuch/bridge/issues) — bug reports, feature requests

## Code of Conduct

Be respectful. Be constructive. We're building something interesting together.
