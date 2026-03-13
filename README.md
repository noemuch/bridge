# Bridge DS

AI-powered design generation in Figma — 100% design system compliant.

Bridge turns [Claude Code](https://claude.ai/download) into a designer that knows your design system inside out. It extracts, documents, and uses your real Figma components, tokens, and text styles to generate production-ready designs.

```
You describe what you want
  → Claude consults the knowledge base (your DS, documented)
  → Claude writes the spec (exact components, tokens, layout)
  → Claude generates in Figma via figma_execute (real DS components, bound variables)
  → You review in Figma
```

## How it works

Bridge is two things:

1. **A CLI** (`bridge-ds init`) that scaffolds your project with the design workflow skill
2. **A Claude Code skill** (`/design-workflow`) that handles the intelligence — spec writing, DS knowledge, Figma generation

The transport layer is [figma-console-mcp](https://github.com/southleft/figma-console-mcp), an MCP server that gives Claude native access to Figma (57+ tools).

```
Claude Code  ──MCP──>  figma-console-mcp  ──WebSocket──>  Figma Desktop
                                                            (your DS library,
                                                             real components,
                                                             bound variables)
```

## Prerequisites

- [Claude Code](https://claude.ai/download) installed
- [Node.js 18+](https://nodejs.org)
- [Figma Desktop](https://www.figma.com/downloads/) (not the web app)
- A Figma file with a published design system library

## Quick Start

### 1. Install figma-console-mcp

```bash
claude mcp add figma-console -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN \
  -- npx -y figma-console-mcp@latest
```

Get your token from [Figma Settings → Personal access tokens](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens).

### 2. Connect Figma Desktop

1. Run `npx figma-console-mcp@latest --print-path` to find the plugin directory
2. In Figma Desktop: **Plugins → Development → Import plugin from manifest...**
3. Select `figma-desktop-bridge/manifest.json`
4. Run the plugin in your Figma file

### 3. Initialize your project

```bash
cd your-project
npx bridge-ds init
```

This scaffolds:
- `.claude/skills/design-workflow/` — the workflow skill + references
- `.claude/commands/design-workflow.md` — the `/design-workflow` slash command
- `specs/` — directory for active, shipped, and dropped specs

### 4. Build your knowledge base

Open Claude Code in your project:

```
/design-workflow setup
```

Claude will:
1. Extract your entire DS from Figma (`figma_get_design_system_kit`)
2. Analyze every component, token, and style
3. Generate intelligent guides (when to use what, decision trees, pattern catalog)
4. Ask for product screenshots to document layout patterns

### 5. Start designing

```
/design-workflow spec a settings page for account information
```

Claude consults the knowledge base, identifies the right pattern, components, and tokens, and writes a complete spec. Then:

```
/design-workflow design    # Generate in Figma (atomic, verified)
/design-workflow review    # Validate against spec
/design-workflow done      # Archive and ship
```

## The Workflow

```
setup (once)  →  spec  →  design  →  review  →  done
                   ↑                    |
                   └── iterate ─────────┘
```

### Spec-first
No design without a validated specification. Claude knows exactly which components, tokens, and layout patterns to use because it has your DS documented.

### Atomic generation
Designs are generated in 4-6 small sequential scripts (~30-80 lines each). After each step, Claude takes a screenshot and verifies before continuing. Bug in step 3? Fix and re-run step 3 only.

### DS-native
Zero hardcoded hex colors. Zero recreated components. Everything imported from your library via `importComponentByKeyAsync`, bound to variables via `setBoundVariableForPaint`.

### Quality gates
Blocking checks at every phase transition: spec validation, pattern matching, pre-script element audit, visual fidelity review, DS component reuse audit.

## Knowledge Base

The knowledge base is what makes Bridge different from "just executing Figma scripts". During setup, Claude builds a complete understanding of your DS:

```
knowledge-base/
  registries/          ← Raw DS data (components, variables, text styles)
  guides/
    design-patterns.md ← Layout patterns from your product screenshots
    tokens/            ← When to use which color, spacing, typography
    components/        ← Decision tree: "I need X" → use component Y
    patterns/          ← Form, navigation, feedback, multi-step patterns
    assets/            ← Icons, logos, illustrations catalog
  ui-references/       ← Product screenshots for pattern extraction
```

## Commands

| Command | What it does |
|---------|-------------|
| `/design-workflow setup` | Extract DS + build knowledge base |
| `/design-workflow spec {name}` | Write a component or screen spec |
| `/design-workflow design` | Generate in Figma from active spec |
| `/design-workflow review` | Validate design against spec + tokens |
| `/design-workflow done` | Archive spec and ship |
| `/design-workflow drop` | Abandon with preserved learnings |
| `/design-workflow status` | Show current state, suggest next action |

## License

MIT
