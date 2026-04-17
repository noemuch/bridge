<p align="center">
  <img src="docs/assets/bridge-banner.png" alt="Bridge" width="800" />
</p>

<p align="center">
  <strong>Compiler-grade trust for AI-generated Figma.</strong><br/>
  <em>Deterministic compiler · Living KB · MCP-native</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@noemuch/bridge-ds"><img src="https://img.shields.io/npm/v/@noemuch/bridge-ds?color=0183ff" alt="npm version" /></a>
  <a href="https://github.com/noemuch/bridge/stargazers"><img src="https://img.shields.io/github/stars/noemuch/bridge?color=0183ff" alt="Stars" /></a>
  <a href="https://github.com/noemuch/bridge/actions"><img src="https://github.com/noemuch/bridge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

<div align="center">

[Discussions](https://github.com/noemuch/bridge/discussions) · [Issues](https://github.com/noemuch/bridge/issues) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

</div>

<br />

Bridge compiles your design-system intent into Figma output that's **guaranteed DS-compliant by construction — not by verification**. 26 Figma API rules enforced automatically by a local compiler. Zero hardcoded values, zero raw Plugin API code, zero AI hallucinations.

Three pillars: a **deterministic compiler** (the moat), **conversational UX** via Claude Code skills (`make` / `fix` / `done`), and a **living KB** continuously synchronized with Figma via cron.

## For designers

Design components and screens **from natural language** inside Claude Code. Bridge handles the rest:

```
# In Claude Code, inside your DS repo:
make a settings screen for account information
```

Bridge produces:

1. A structured CSpec (YAML) describing the layout + tokens
2. A scene graph JSON (validated against your DS registries)
3. Compiled Figma Plugin API code (all 26 rules respected)
4. Executed designs in Figma via MCP

Every output uses your real components, bound variables, and text styles. **Zero hardcoded values.**

Iterate with `fix` (capture manual Figma edits as learnings). Ship with `done` (archive + extract recipes).

## For DS teams

Bridge keeps your knowledge base **continuously synchronized** with Figma.

- **`setup bridge`** in Claude Code bootstraps your DS repo: registries, cron workflow, all in one flow.
- **Daily cron** on GitHub Actions pulls Figma via REST, detects KB drift, opens a PR with the diff. Silent on no-change.
- **Recipe + CSpec ref-validity checks** flag broken references when components are renamed or removed.

## For engineers

The KB lives in your repo at `bridge-ds/knowledge-base/registries/`. Point your AI client at this directory or read it programmatically. Your generated code uses tokens, variants, and composition rules correctly — because it reads the source of truth, not guesses.

## Quick start

**In Claude Code, any session (one-time install):**

```
/plugin marketplace add noemuch/bridge
/plugin install bridge-ds
```

**In your DS repo:**

```
cd /path/to/ds-repo && claude
setup bridge
```

One phrase. The skill handles pre-flight, scaffolding, extraction, GitHub secret, first commit, and optional cron test. ~10 minutes end-to-end.

**Upgrading from v5.x?** See [BREAKING.md](BREAKING.md) for the v6 migration guide.

---

## Architecture

| Layer         | Technology            | Description                                                  |
| ------------- | --------------------- | ------------------------------------------------------------ |
| **Workflow**  | Claude Code Skills    | Six focused skills (see [Skills](#skills) below)             |
| **Spec**      | CSpec YAML            | Structured, human-readable compilable specifications         |
| **Compiler**  | TypeScript            | Scene graph JSON → Figma Plugin API code (26 rules enforced) |
| **Transport** | MCP                   | `figma-console-mcp` (preferred) or official Figma MCP server |
| **Target**    | Figma Desktop / Cloud | Production-ready designs in your real DS library             |
| **Memory**    | Knowledge Base        | Registries, guides, recipes, learnings — per-project         |

```
You describe → Claude writes CSpec → Compiler resolves tokens → MCP → Figma
```

## Skills

| Skill                       | Trigger              | Purpose                                                  |
| --------------------------- | -------------------- | -------------------------------------------------------- |
| `using-bridge`              | SessionStart (auto)  | Force-loaded rules, command map, drop/status procedures  |
| `generating-figma-design`   | `make <description>` | Spec + compile + execute + verify                        |
| `learning-from-corrections` | `fix`                | Diff Figma corrections, extract learnings, patch recipes |
| `shipping-and-archiving`    | `done`               | Final gate, archive, extract recipes                     |
| `extracting-design-system`  | `setup bridge`       | Bootstrap a DS repo end-to-end                           |

## The compiler

Every scene graph JSON goes through a deterministic pipeline:

```bash
bridge-ds compile --input scene.json --kb <kb-path> --transport <console|official>
```

| Stage        | Purpose                                                                              |
| ------------ | ------------------------------------------------------------------------------------ |
| **Parse**    | Load scene graph JSON, validate schema                                               |
| **Resolve**  | Look up every `$token` reference against the knowledge base registries               |
| **Validate** | Check structure, detect missing tokens with fuzzy suggestions, flag hardcoded values |
| **Plan**     | Chunk large graphs for transport limits; bridge nodeIds across chunks                |
| **Generate** | Emit Figma Plugin API code respecting all 26 rules                                   |
| **Wrap**     | Adapt output for the target transport (console IIFE vs. official top-level await)    |

Errors are caught at compile time, before anything touches Figma.

[Compiler reference →](references/compiler-reference.md) · [Transport adapter →](references/transport-adapter.md) · [Verification gates →](references/verification-gates.md)

## Bridge CLI

Direct CLI commands (typically invoked under the hood by skills):

| Command                                              | Purpose                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `bridge-ds setup --ds-name <name> --figma-key <key>` | Headless scaffold (used by `setup bridge`)                  |
| `bridge-ds compile --input <json> --kb <path>`       | Compile a scene graph JSON                                  |
| `bridge-ds doctor`                                   | Diagnose config, connectivity, KB health                    |
| `bridge-ds extract --headless`                       | Figma REST extraction (CI-friendly, `FIGMA_TOKEN` required) |
| `bridge-ds migrate`                                  | Upgrade a legacy knowledge base to the current schema       |
| `bridge-ds cron`                                     | Run the cron orchestrator (KB sync, opens PR on diff)       |

## Recipes

Recipes are parameterized scene graph templates the compiler reuses across sessions. The fastest way to build one: generate a screen with `make`, then `done` to archive — Bridge auto-extracts a recipe when the layout is reusable.

Recipes live under `bridge-ds/knowledge-base/recipes/` in your repo. Schema: `{ id, name, archetype, tags, scene_graph, confidence }`. Each recipe is scored against the user's description on four axes (archetype match, tag overlap, structural similarity, confidence). High-scoring recipes pre-fill the CSpec.

Full schema: [`references/compiler-reference.md`](references/compiler-reference.md#recipe-schema).

## Project structure

```
bin/                                 CLI entry (bridge-ds binary)
lib/
  cli/                               Typed CLI (main, setup-orchestrator, token-handling, …)
  compiler/                          Scene graph compiler (TypeScript)
  config/                            YAML config parsing
  cron/                              GitHub Actions cron orchestrator (KB sync)
  extractors/                        Figma REST + MCP extractors
  kb/                                Knowledge base (registries, hashing, auto-detect)
  mcp/                               MCP transport adapter (console/official)

references/                          Shared repo-level references
  compiler-reference.md
  transport-adapter.md
  verification-gates.md
  red-flags-catalog.md

skills/
  using-bridge/                      Force-loaded process skill
  generating-figma-design/           make
  learning-from-corrections/         fix
  shipping-and-archiving/            done
  extracting-design-system/          setup

hooks/                               SessionStart health-line hook
scripts/                             validate-skills, bump-version
test/                                Integration + security tests

.claude-plugin/                      Claude Code plugin manifest
.cursor-plugin/                      Cursor plugin manifest
```

## Plugin support

Bridge DS works as a plugin for:

- **Claude Code** — Native skill via `.claude-plugin/` and SessionStart hook injection.
- **Cursor** — Plugin via `.cursor-plugin/`.

Both use the same MCP transport and compiler infrastructure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code guidelines, and PR process.

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://www.linkedin.com/in/noechague/">Noé Chagué</a> — Design System <a href="https://finary.com">@Finary</a>
</p>
