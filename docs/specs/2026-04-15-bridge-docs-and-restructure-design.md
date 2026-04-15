# Bridge Docs + Architecture Restructure — Design Spec

| Field    | Value                                                  |
| -------- | ------------------------------------------------------ |
| Author   | DS maintainer                                          |
| Date     | 2026-04-15                                             |
| Status   | Approved for implementation planning                   |
| Version  | 1.0 (combined spec)                                    |
| Scope    | Bridge DS v4.0.0 — Bridge Docs V0.1 + skill split      |
| Language | English (Bridge artifact policy)                       |

> A compiler-driven, GitHub-native, LLM-first documentation layer for design
> systems, and the skill architecture restructure required to ship it without
> dragging legacy debt. The repo is the product. The cron is the safety net.
> No website, no SaaS, no build step.

---

## 1. Executive summary

### 1.1 What we are building

**Bridge Docs** is a new surface of Bridge that auto-generates a dual-readable
(human + LLM) design system documentation layer in the user's own GitHub repo.
It is driven by the existing Bridge knowledge base (registries, learnings,
recipes, shipped specs), kept fresh by a daily GitHub Actions cron that
reconciles Figma against the repo via pull requests, and queryable by any
AI agent through a local Model Context Protocol (MCP) server.

Shipping Bridge Docs cleanly requires a second, parallel piece of work:
**splitting Bridge's monolithic `skills/design-workflow/SKILL.md` into six
focused skills** (five action skills + one force-loaded process skill),
adopting three patterns from prior-art research on AI-skill architectures
that give the biggest quality leverage without importing over-granular structure.

### 1.2 Why this, why now

- Design system documentation is the #1 adoption bottleneck for every DS.
  Current SaaS tools (Supernova ~400€/mo, Zeroheight ~300€/mo) require
  manual content writing, create vendor lock-in, and drift from source.
- Bridge already has ~85% of the data a DS doc needs (registries, learnings,
  specs, recipes, history).
- The LLM-native era makes a new answer possible: documentation that lives
  in the repo as plain Markdown, optimally structured for both humans on
  github.com and AI agents via `llms.txt` + MCP.
- Bridge's compiler is a structurally unreachable moat for Supernova and
  Zeroheight: they are downstream of Figma, we are downstream of a compiler
  that produces token-resolved structured intent. This enables auto-migration
  guides, cascade-driven doc regeneration, and `done`-time cascade updates
  that no other tool can replicate without building a parallel compiler.

### 1.3 Core innovations

1. **Cron as primary freshness guarantee.** The system that does not forget.
   Daily GitHub Action extracts Figma via REST API, diffs against KB,
   regenerates impacted docs, opens a PR. `done`-triggered updates are a
   fast-path optimization, not a correctness requirement.
2. **Cascade engine driven by a `_index.json` relationship graph.** One
   token rename → impacted components identified → only their docs
   regenerated → migration guide auto-authored.
3. **Dual-readable single markdown.** One `.md` per component, pure
   CommonMark, structured to serve both humans (prose, tables, rendered on
   github.com) and LLMs (stable anchors, frontmatter, sidecar JSON,
   `llms.txt` index following the Answer.AI spec).
4. **Content provenance as first-class concept.** Every section is signed
   via HTML-comment markers (`<!-- source: cspec.docs.do[0] -->`) with an
   optional confidence and decay policy for AI-inferred content.
5. **DS-as-MCP server.** Local MCP exposes the DS as queryable resources
   (`ds://component/Button`, `ds://token/color/bg/primary`). Any MCP-capable
   agent (Claude Code, Cursor, Copilot CLI, Codex) gets structured answers
   instead of string-matching through markdown.
6. **Bridge skill restructure.** Six focused skills replace the 300-line
   monolith. `using-bridge` force-loaded via SessionStart hook. Three
   prior-art patterns adopted: description-as-triggers, HARD-GATE
   markers, shared verification gates.

### 1.4 Non-goals (explicit, non-negotiable for V0.1)

- **No website.** No Astro, Starlight, Docusaurus, Mintlify, GitHub Pages
  deploy. The repo renders on github.com and is consumed as files.
- **No screenshot PNGs in git.** Figma deeplinks in frontmatter only.
- **No build step the user runs.** The cron and the CLI do all work.
- **No SaaS dashboard, no hosted search, no auth layer.**
- **No consumer-repo mode.** Bridge Docs V0.1 assumes Bridge runs inside
  the DS repo. Reading a remote KB from a consumer repo is V1.0+.
- **No codemods.** `bridge codemod token-rename` is a V1.0+ ambition; V0.1
  stops at generating migration guides with manual `rg` commands.
- **No visual/WYSIWYG editor.** Markdown only. If a non-technical writer
  needs to contribute, they edit Markdown or ask Claude to edit for them.
- **No generalized multi-language i18n.** The DS docs are English-only
  (Bridge's artifact policy already enforces this).

---

## 2. Context and prior decisions

### 2.1 Bridge v3.1.0 state (baseline)

- Scene Graph Compiler (`lib/compiler/`) operational.
- CSpec YAML format for component and screen specs.
- Recipe system with confidence scoring.
- Unified `make` / `fix` / `done` / `setup` / `drop` commands.
- Monolithic `skills/design-workflow/SKILL.md` (~310 lines) with action
  references under `skills/design-workflow/references/actions/`.
- MCP transports: `figma-console-mcp` (preferred) and official Figma MCP
  (fallback).
- Distribution: npm `@noemuch/bridge-ds` + Claude Code + Cursor
  marketplaces.

### 2.2 RFC → spec pivots (summary)

The original RFC (Bridge Docs V0.2.0 RFC, 2026-04-15) proposed an
Astro/Starlight website deployed to GitHub Pages. User-driven pivots
during brainstorming collapsed this to a repo-native, build-less design:

| Original RFC                         | Final decision                           |
| ------------------------------------ | ---------------------------------------- |
| Astro Starlight website              | Pure CommonMark in the repo              |
| GitHub Pages deployment              | No deploy — github.com renders files     |
| PNG screenshots generated via MCP    | Figma deeplinks only                     |
| Pagefind search index                | GitHub search + MCP server for LLMs      |
| Build command (`astro build`)        | Markdown regeneration only               |
| Three-tier (auto/AI/manual) model    | Seven-source provenance model            |
| On-ship update is killer feature     | On-cron update is primary; on-ship is    |
|                                      | fast-path                                |
| Astro components (Do/Don't, swatches) | None — pure CommonMark                  |

### 2.3 Prior-art takeaways

Three high-leverage patterns worth adopting from prior-art research on AI-skill architectures:

1. **Description field = triggering conditions only.** A workflow summary
   causes Claude to shortcut and skip reading the skill body. Rewriting
   Bridge descriptions as "Use when…" triggers is free leverage.
2. **`<HARD-GATE>` and Red Flags tables.** Pure prompt convention, zero
   tooling cost, high behavioral effect. Used to enforce "never write raw
   Plugin API", "never claim done without screenshot diff", etc.
3. **Shared verification gate as a reference file.** Inlined at the end of
   each action skill. Not a separate skill (that is the granularity trap
   common in general-purpose skill libraries; Bridge has 3 concrete gates,
   not a general-purpose verification discipline).

Two patterns explicitly rejected:

1. **14-skill libraries granularity.** Bridge is a single-domain tool. Six skills.
2. **No-dependency dogma.** Bridge has a compiler, MCP, REST API, and
   needs Handlebars/figlet/clack. That is correct for a real tool.

---

## 3. Architecture overview

### 3.1 System diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                    User's DS repo (e.g. acme-design-system)            │
│                                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐   │
│  │  bridge-ds/  │    │design-system/│    │ .github/workflows/     │   │
│  │   (engine)   │───▶│   (docs)     │    │ bridge-docs-cron.yml   │   │
│  │              │    │              │    └──────────┬─────────────┘   │
│  │ knowledge-   │    │ components/  │               │                 │
│  │  base/       │    │ foundations/ │               ▼                 │
│  │ specs/       │    │ patterns/    │    ┌────────────────────────┐   │
│  │              │    │ changelog/   │    │ GitHub Actions runner  │   │
│  └──────────────┘    │ _manual/     │    │ (cron @ 06:00 UTC)     │   │
│                      └──────────────┘    └──────────┬─────────────┘   │
│                                                     │                 │
│  ┌──────────────┐                                   │                 │
│  │  llms.txt    │◀──────────────┐                   │                 │
│  │llms-full.txt │               │                   │                 │
│  │ AGENTS.md    │               │                   │                 │
│  │ CLAUDE.md    │               │                   │                 │
│  │.cursor/rules/│               │                   │                 │
│  └──────────────┘               │                   │                 │
│                                 │                   │                 │
│  ┌──────────────┐               │                   │                 │
│  │ .bridge/     │               │                   │                 │
│  │  mcp.json    │               │                   │                 │
│  │docs-state    │               │                   │                 │
│  └──────────────┘               │                   │                 │
└─────────────────────────────────┼───────────────────┼─────────────────┘
                                  │                   │
        ┌─────────────────────────┘                   │
        │                                             │
┌───────┴──────────┐                         ┌────────▼──────────────┐
│ Designer in      │                         │ Figma REST API        │
│ Claude Code:     │                         │ (variables, components,│
│ make/fix/done    │                         │  styles)               │
│                  │                         │                        │
│ `done` cascades  │                         │ Called with            │
│ docs update      │                         │ FIGMA_TOKEN secret     │
└──────────────────┘                         └────────────────────────┘
        │
        │ Claude Code skills invoked:
        │ - using-bridge (force-loaded)
        │ - generating-figma-design
        │ - learning-from-corrections
        │ - shipping-and-archiving  ──────▶ triggers generating-ds-docs
        │ - extracting-design-system
        │ - generating-ds-docs
        ▼

┌─────────────────────────────────────┐
│ Consumer repo (acme-web, etc.)      │
│                                      │
│ Cursor / Claude Code / Copilot CLI:  │
│                                      │
│  a) Reads llms.txt from DS repo      │
│     (submodule / npm / URL)          │
│                                      │
│  b) Queries MCP server:              │
│     ds://component/Button            │
│     ds://token/color/bg/primary      │
└─────────────────────────────────────┘
```

### 3.2 Two repo contexts

**Repo A — the DS repo (V0.1 scope).** One per organization. Bridge runs
here. KB + specs + generated docs all live here. Cron runs here.

**Repo B — consumer repos (V1.0+ scope).** Where designers generate
product screens with `make`. V0.1 does not attempt to solve KB sharing
across repos. Deferred.

### 3.3 Three distribution surfaces (one codebase)

1. **npm CLI** — `npx @noemuch/bridge-ds init-docs` for bootstrap;
   `bridge-ds doctor` / `bridge-ds extract --headless` for ops.
2. **Claude Code / Cursor skill** — interactive workflows via the 6 skills.
3. **GitHub Action** — the cron workflow distributed as a template
   scaffolded into the user's `.github/workflows/`.

No Figma plugin, no VSCode extension, no Figma app. The compiler already
plays the Figma role.

---

## 4. Documentation format

### 4.1 Anatomy of a component `.md`

Canonical shape, validated against shadcn/ui, Stripe, Anthropic, and the
8-DS survey (Polaris, Carbon, Atlassian, Primer, Material, Spectrum,
Radix, shadcn).

```markdown
---
name: Button
category: actions
status: stable
since: 2.1.0
figma: https://figma.com/file/abc/Acme?node-id=12:345
a11y: WCAG 2.2 AA · audited 2026-04-09
related:
  alternatives: [Link, IconButton]
  composes-with: [Icon, Spinner]
  supersedes: [LegacyButton]
tokens:
  color: [bg.primary, text.on-primary, border.focus]
  spacing: [button.padding-x, button.padding-y]
  radius: [md]
  text: [label.md]
generated-from:
  kb-version: 3.2.0
  registries-hash: sha256:abc123
  learnings-hash: sha256:def456
  last-ship: 2026-04-09
last-regenerated: 2026-04-15T06:00:00Z
ships: 8
learnings-applied: 12
---

# Button

> Triggers an action. Use for commits, submits, destructive confirmations,
> and primary CTAs. For navigation use Link. For toggles use Switch.

## When to use

<!-- source: cspec.docs.when_to_use -->

- Primary action in a form or dialog (`variant: primary`).
- Destructive confirmation (`variant: danger`, paired with confirmation dialog).
- Secondary action paired with a primary (`variant: secondary`).

## When NOT to use

<!-- source: cspec.docs.when_not_to_use + learning #047 -->

- Navigation between pages → use [Link](../link/README.md).
- Toggling state → use [Switch](../switch/README.md).
- Icon-only action with tooltip → use [IconButton](../icon-button/README.md).

## Props

<!-- source: registry.componentPropertyDefinitions -->

| Prop       | Type                                       | Default   | Since  |
| ---------- | ------------------------------------------ | --------- | ------ |
| `variant`  | `primary \| secondary \| ghost \| danger`  | `primary` | 1.0    |
| `size`     | `sm \| md \| lg`                           | `md`      | 1.0    |
| `icon`     | `IconName`                                 | —         | 2.0    |
| `iconSide` | `leading \| trailing`                      | `leading` | 2.0    |
| `loading`  | `boolean`                                  | `false`   | 2.1    |
| `disabled` | `boolean`                                  | `false`   | 1.0    |

## Variants

<!-- source: registry.variantAxes + cspec.docs -->

### `primary`
Default CTA. One per view max. Background `$color/bg/primary`.

### `secondary`
Paired with primary ("Cancel"). Background `$color/bg/neutral`.

### `ghost`
Low-emphasis in toolbars. No background at rest.

### `danger`
Destructive only. Always inside a confirmation dialog.

## Tokens

<!-- source: scene-graph.tokens + variables.json -->

| Token                        | Light     | Dark      | Usage          |
| ---------------------------- | --------- | --------- | -------------- |
| `$color/bg/primary`          | `#0066FF` | `#3385FF` | Primary bg     |
| `$color/text/on-primary`     | `#FFFFFF` | `#FFFFFF` | Primary label  |
| `$spacing/button/padding-x`  | `16px`    | `16px`    | Horizontal pad |

## Do

- ✅ One `primary` per view
  <!-- source: learning#008 · frequency=4 -->
- ✅ Sentence case labels ("Save changes")
  <!-- source: cspec.docs.do[1] -->
- ✅ `size: md` minimum on touch targets
  <!-- source: ai-inferred · confidence=0.85 · last-reviewed=2026-04-15 -->

## Don't

- ❌ Multiple primaries — hierarchy collapse
  <!-- source: learning#003 -->
- ❌ Button for navigation — use Link
  <!-- source: learning#021 -->
- ❌ Hardcode hex; always use `$color/bg/primary`
  <!-- source: learning#015 -->

## Accessibility

<!-- source: ai-inferred · confidence=0.9 · last-reviewed=2026-04-15 -->

- Label OR `aria-label` required (mandatory when `iconOnly`).
- Focus ring: `$color/border/focus`, 2px offset.
- `loading` state sets `aria-busy="true"` + `disabled`.
- Touch target ≥ 44×44px (enforced by `size: md`).
- Keyboard: `Enter` and `Space` activate.

## Source

- **Figma**: [Button in Acme DS](https://figma.com/file/abc?node-id=12:345)
- **Spec**: [`specs/shipped/Button.cspec.yaml`](../../../../bridge-ds/specs/shipped/Button.cspec.yaml)
- **Recipe**: none (atomic component)
- **Last shipped**: 2026-04-09
- **Generated**: 2026-04-15 from KB v3.2.0
```

### 4.2 Structural rules

- **Pure CommonMark only.** No MDX, no JSX, no HTML other than the
  `<!-- source: ... -->` provenance comments (which GitHub hides).
- **One `.md` per component + one `.json` sidecar per component.** Sidecar
  carries the machine-readable slice (props, variants, tokens, relationships)
  for MCP consumption and for the doc-linter.
- **Backtick headings for variants** (`### \`primary\``) to produce stable
  GitHub anchors (`#primary`).
- **Relative links only.** Never absolute URLs to the same repo.
- **YAML frontmatter is strict.** Schema enforced by the linter.
- **Ordered sections.** When to use → When NOT to use → Props → Variants →
  Tokens → Do → Don't → Accessibility → Source. Order is part of the
  contract; deviation breaks llms.txt consumers expecting predictable
  chunks.

### 4.3 Sidecar `.json` format

```json
{
  "$schema": "https://bridge-ds.dev/schemas/component-v1.json",
  "name": "Button",
  "category": "actions",
  "status": "stable",
  "since": "2.1.0",
  "figma": {
    "file": "abc",
    "nodeId": "12:345",
    "url": "https://figma.com/file/abc?node-id=12:345"
  },
  "props": [
    {
      "name": "variant",
      "type": "enum",
      "values": ["primary", "secondary", "ghost", "danger"],
      "default": "primary",
      "since": "1.0"
    }
  ],
  "variants": ["primary", "secondary", "ghost", "danger"],
  "tokens": {
    "color": ["bg.primary", "text.on-primary", "border.focus"],
    "spacing": ["button.padding-x", "button.padding-y"],
    "radius": ["md"],
    "text": ["label.md"]
  },
  "relationships": {
    "alternatives": ["Link", "IconButton"],
    "composesWith": ["Icon", "Spinner"],
    "supersedes": ["LegacyButton"],
    "deprecatedBy": null
  },
  "a11y": {
    "wcag": "2.2 AA",
    "auditedAt": "2026-04-09"
  }
}
```

### 4.4 llms.txt and llms-full.txt

Following the Answer.AI spec. `llms.txt` is a curated index, `llms-full.txt`
is the concatenation of every `.md` in `design-system/`.

```markdown
# Acme Design System

> Acme's compiler-driven design system. All components use semantic tokens
> (`$color/...`, `$spacing/...`); never primitive values. For all docs
> inlined: [llms-full.txt](./llms-full.txt).

## Components

- [Button](./design-system/components/actions/Button.md): Primary actions,
  CTAs, destructive confirmations.
- [Link](./design-system/components/actions/Link.md): Navigation between
  pages or anchors.
- [Input](./design-system/components/forms/Input.md): Single-line text input.
...

## Foundations

- [Color](./design-system/foundations/color.md): Semantic color tokens,
  light/dark pairing.
- [Typography](./design-system/foundations/typography.md): Type scale,
  hierarchy, weights.
...

## Patterns

- [Form patterns](./design-system/patterns/form-patterns.md)
...

## Optional

- [Changelog](./design-system/changelog/README.md)
- [Migration guides](./design-system/changelog/migrations/)
- [Guidelines](./design-system/guidelines/)
```

### 4.5 Full repo structure (user-facing)

```
<user-repo>/
├── README.md                               👤 human-authored
├── llms.txt                                🤖 generated
├── llms-full.txt                           🤖 generated
├── AGENTS.md                               🤖 generated
├── CLAUDE.md                               🤖 generated
├── docs.config.yaml                        👤 user-edited
│
├── .bridge/
│   ├── mcp.json                            🤖 generated
│   └── docs-state.json                     🤖 hashes + timestamps
│
├── .cursor/rules/
│   └── design-system.mdc                   🤖 generated
│
├── .github/
│   ├── copilot-instructions.md             🤖 generated
│   └── workflows/
│       └── bridge-docs-cron.yml            🤖 generated
│
├── bridge-ds/                              🔒 engine (bridge-managed)
│   ├── knowledge-base/
│   │   ├── registries/
│   │   │   ├── components.json
│   │   │   ├── variables.json
│   │   │   ├── text-styles.json
│   │   │   └── icons.json
│   │   ├── guides/
│   │   ├── recipes/
│   │   │   ├── _index.json
│   │   │   └── r-*.json
│   │   ├── learnings.json
│   │   └── _index.json                     🤖 relationship graph
│   └── specs/
│       ├── active/
│       ├── shipped/
│       ├── backlog/
│       └── history.log
│
├── design-system/                          🌐 public docs
│   ├── README.md                           🤖 generated (landing)
│   ├── components/
│   │   ├── README.md                       🤖 index
│   │   ├── llms.txt                        🤖 nested index
│   │   ├── actions/
│   │   │   ├── Button.md                   🤖 + preserved manual regions
│   │   │   └── Button.json                 🤖
│   │   ├── forms/
│   │   ├── feedback/
│   │   └── ...
│   ├── foundations/
│   │   ├── color.md
│   │   ├── color.json
│   │   ├── typography.md
│   │   └── spacing.md
│   ├── patterns/
│   ├── guidelines/
│   │   ├── do-dont.md                      🤖 aggregated
│   │   ├── accessibility.md
│   │   └── principles.md                   👤 symlink to _manual/principles.md
│   ├── changelog/
│   │   ├── README.md                       🤖 per-month aggregate
│   │   ├── components/                     🤖 per-component changelog
│   │   │   ├── Button.md
│   │   │   └── ...
│   │   └── migrations/                     🤖 auto-migration guides
│   └── _manual/                            👤 SACRED — never touched
│       ├── getting-started.md
│       ├── voice-and-tone.md
│       ├── design-principles.md
│       └── decisions/                      👤 ADRs
│           └── 0001-color-system.md
│
└── package.json
```

Legend: 🤖 generated (cron/done/manual regenerate), 👤 human-authored,
🔒 engine internal, 🌐 public-facing docs.

---

## 5. Content generation and provenance

### 5.1 The seven sources of truth

Ordered by confidence (higher = fewer edits from Claude):

| # | Source                         | Lives in                                        | Confidence |
| - | ------------------------------ | ----------------------------------------------- | ---------- |
| 1 | `CSpec.intent` (designer-written) | `bridge-ds/specs/shipped/<name>.cspec.yaml`  | Very high  |
| 2 | `CSpec.docs` (optional, filled during ship-time interview or by hand) | Same | Very high |
| 3 | Registry metadata              | `bridge-ds/knowledge-base/registries/*.json`    | Factual    |
| 4 | Scene graph                    | `bridge-ds/specs/shipped/<name>/scene-graph.json` | Factual  |
| 5 | Learnings (filtered)           | `bridge-ds/knowledge-base/learnings.json`       | Medium (dep. frequency) |
| 6 | Category inheritance           | `bridge-ds/knowledge-base/guides/components/<cat>.md` | Generic |
| 7 | AI inference                   | Claude using 1-6 as input                       | Marked + confidence-scored |

### 5.2 CSpec new optional block

The CSpec YAML gains an optional `docs:` block. Entirely optional; blank
fields fall back to AI inference marked with `ai-inferred`.

```yaml
docs:
  when_to_use: >
    Selectable list rows in multi-select or single-select contexts.
  when_not_to_use: >
    For non-selectable lists → use ListRow.
  do:
    - "Pair with ListGroupHeader for sectioned lists"
    - "Use `size: sm` in dense tables"
  dont:
    - "Don't use for navigation — use Link"
  related:
    - { name: ListRow, reason: "Non-selectable alternative" }
    - { name: Checkbox, reason: "Building block" }
  accessibility:
    role: option
    notes: "Ensure clear label; focus ring required."
```

### 5.3 Ship-time interview (ship-time guidance capture)

Triggered by `shipping-and-archiving` skill on the **first ship** of a new
component (detected by absence of an entry in `history.log`). Three optional
questions, each skippable with Enter. Total overhead < 30 seconds.

```
✅ SelectableRow shipped. Verification passed.

Three quick, optional questions (Enter to skip any):

1. Main use case (one line)?
2. A common mistake to avoid?
3. One related component worth mentioning?
```

Answers are written to the CSpec's `docs:` block and become the
designer-intent source for the first doc generation. Silent on subsequent
ships unless the user says `bridge docs interview <component>` to refresh.

### 5.4 Provenance markers

Every AI-consumable section is tagged with an HTML comment (invisible on
github.com, readable by LLMs and the linter). Three shapes:

```html
<!-- source: cspec.docs.do[0] -->
<!-- source: learning#021 · frequency=4 -->
<!-- source: ai-inferred · confidence=0.85 · last-reviewed=2026-04-15 -->
```

The linter parses these and enforces:
- Every AI-inferred block has `confidence` and `last-reviewed`.
- Every learning reference resolves to a real learning in `learnings.json`.
- Every CSpec reference resolves to a real field.

### 5.5 Content decay policy

- AI-inferred content with `last-reviewed` > 90 days old → flagged by the
  cron's weekly hygiene sweep (first Monday of each month). Opens a PR to
  regenerate.
- Learning references: if the underlying learning's `frequency` doubled or
  was retired since the doc was generated → flagged.
- The user can suppress a flag per-block with `<!-- manual:lock -->`.

### 5.6 Learning → Do/Don't promotion lifecycle

Only learnings with `frequency >= 3 && agreedBy >= 2` are auto-promoted
into visible Do/Don't rules. Below threshold, they stay in the internal
`learnings.json` but don't appear in public docs. Rationale: prevents
one-off corrections from polluting public guidance with noise.

---

## 6. The cascade engine

### 6.1 The `_index.json` relationship graph

Single source of truth for "what depends on what". Regenerated from scratch
on `setup`, incrementally patched on `done`.

```json
{
  "version": "3.2.0",
  "generatedAt": "2026-04-15T06:00:00Z",
  "tokenIndex": {
    "$color/bg/primary": {
      "category": "color",
      "valuesByMode": {
        "light": "#0066FF",
        "dark": "#3385FF"
      },
      "usedBy": ["Button", "Card", "Banner", "PromoCard"]
    }
  },
  "componentIndex": {
    "Button": {
      "category": "actions",
      "status": "stable",
      "uses": {
        "tokens": ["$color/bg/primary", "$color/text/on-primary", "..."],
        "components": ["Icon", "Spinner"]
      },
      "usedBy": [],
      "alternatives": ["Link", "IconButton"],
      "composesWith": ["Icon", "Spinner"],
      "supersedes": ["LegacyButton"],
      "deprecatedBy": null
    }
  },
  "learningIndex": {
    "L008": {
      "scope": ["Button", "Modal"],
      "frequency": 4,
      "agreedBy": 2,
      "promoted": true,
      "promotedAt": "2026-04-12"
    }
  },
  "patternIndex": {
    "form-submit": {
      "components": ["Input", "Button"],
      "recipes": ["r-form-001"]
    }
  }
}
```

### 6.2 The engine pipeline

```
1. Source watcher
   - On cron: compute fresh registries from Figma REST API, compare hashes.
   - On done: observe written CSpec + new entries in learnings.json.
   - On manual: full walk.

2. Diff engine
   - Per source: registries, learnings, CSpecs, guides.
   - Output: changeset { added, modified, removed, renamed }.

3. Impact analyzer
   - Traverse _index.json for each changeset entry.
   - Example: $color/bg/primary modified → tokenIndex.usedBy → 4 components.
   - Example: Button.registry.componentPropertyDefinitions changed → Button.md.
   - Example: L021 frequency hit 3 → promoted → all components in L021.scope.
   - Output: list of target .md files to regenerate + migration-guide flags.

4. Regen planner
   - Order: foundations → components → patterns → changelog → migration guides.
   - Read existing .md, parse preserved regions (_manual/ and inline manual).
   - Regenerate body from templates + sources.
   - Merge preserved regions back.

5. Output
   - Updated .md files.
   - New or updated .json sidecars.
   - New migration guide files (one per breaking change).
   - Per-component changelog append.
   - Refreshed llms.txt, llms-full.txt, AGENTS.md, CLAUDE.md stats lines.
   - PR body (if running under cron).
```

### 6.3 Manual content preservation contract

Three preservation layers, all respected by every regen:

1. **`design-system/_manual/` directory** — absolute sacred zone. Cron
   does not read or write anything under `_manual/`. Symlinks from
   generated areas (e.g. `design-system/guidelines/principles.md` →
   `_manual/design-principles.md`) allow human content to appear in
   generated locations.
2. **Frontmatter flag `manual: true`** on any generated `.md` → file is
   skipped by regen after first creation.
3. **Inline regions** marked with
   `<!-- manual:id -->...<!-- /manual:id -->` are extracted, held aside
   during regen, and re-inserted at their marker positions. If a marker
   disappears from the new template, the content moves to the bottom of
   the file and the regen emits a warning (never silent drops).

### 6.4 Migration guide auto-authoring

Triggered by the impact analyzer detecting a breaking change (token
rename, component rename, component deprecation, prop removal, variant
removal). Output template:

```markdown
---
type: migration
reason: token-rename
date: 2026-04-15
from: "$color/bg/primary"
to: "$color/background/brand/primary"
severity: breaking
deprecated-at: 2026-04-15
removal-at: 2026-07-15
---

# Migration: `$color/bg/primary` → `$color/background/brand/primary`

> Generated by Bridge Docs cron 2026-04-15 from KB diff v3.1.0 → v3.2.0.

## Reason

Token namespace refactor for brand consistency.

## Affected DS docs (auto-updated)

- [Button](../../components/actions/Button.md)
- [Card](../../components/data-display/Card.md)
- [Banner](../../components/feedback/Banner.md)
- (13 more)

## Affected consumer code

Run in your repo:

\`\`\`bash
rg --type tsx --type jsx '\$color/bg/primary'
\`\`\`

## Migration steps

1. Find all references: see command above.
2. Replace `$color/bg/primary` with `$color/background/brand/primary`.
3. Run your typecheck / tests.
4. Commit with: `refactor: migrate to new color/background/brand/primary token`.

## Timeline

- Deprecated: 2026-04-15 (this release)
- Removed: 2026-07-15 (3-month grace period)
```

V1.0+ adds `bridge codemod token-rename` to do step 2 automatically.

---

## 7. The cron system

### 7.1 The contract

- **Cron is the primary freshness guarantee.** `done`-triggered updates are
  a fast-path. If the designer forgets `done`, or tweaks Figma outside
  Bridge, or uses a different tool entirely, the cron catches the drift
  within 24 hours.
- **No silent state changes.** Every cron run that finds a diff opens a
  PR. Clean reviewable history.
- **No-diff runs are no-ops.** No empty PRs, no churn.
- **Cron never touches `_manual/`.** Preserved by contract.

### 7.2 Cadence

- Default: daily at 06:00 UTC.
- Configurable in `docs.config.yaml`:

```yaml
cron:
  cadence: daily          # daily | weekly | "<cron expression>"
  time: "06:00"           # UTC
  maxPRsPerWeek: 7        # safety valve
  autoMergeIfTrivial: false
```

- A separate **weekly hygiene sweep** (first Monday each month) runs the
  linter, dead-link check, AI-content decay check. Opens issues (not PRs)
  for items needing review.

### 7.3 The GitHub Action workflow

Installed at `.github/workflows/bridge-docs-cron.yml`:

```yaml
name: Bridge Docs — Daily Sync

on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Bridge
        run: npm install -g @noemuch/bridge-ds

      - name: Extract DS (headless)
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
        run: bridge-ds extract --headless --output bridge-ds/knowledge-base

      - name: Regenerate docs
        run: bridge-ds docs sync --ci

      - name: Lint docs
        run: bridge-ds docs check --report=report.json

      - name: Open PR if changes
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "docs: Bridge Docs daily sync"
          branch: bridge-docs/cron-sync
          title: "🤖 Bridge Docs — DS sync ${{ github.run_id }}"
          body-path: .bridge/last-sync-report.md
          delete-branch: true
          labels: bridge-docs, automated
```

### 7.4 FIGMA_TOKEN secret management

- User generates a Personal Access Token at figma.com/settings → access
  tokens, scopes: Read-only on file_content, file_variables, library_content.
- Saved as GitHub repo secret `FIGMA_TOKEN`.
- The `init-docs` wizard walks the user through this and provides a direct
  link to the repo's secret-creation URL.
- Token rotation is a user responsibility; the `doctor` command flags if
  the token's test call returns 401/403.

### 7.5 Headless extraction via REST API

Figma REST API endpoints used (all in Figma's stable public API):

- `GET /v1/files/:file_key/variables/local` — variable collections + valuesByMode
- `GET /v1/files/:file_key/components` — components with node IDs
- `GET /v1/files/:file_key/styles` — text + color + effect styles
- `GET /v1/files/:file_key` — fallback for component descriptions (tree walk)

V0.1 scope: extract variables, components, text styles. Anything the
current MCP-based extraction covers for those three registries.

V0.2+: richer extraction (instance property bindings, component
descriptions, deprecated-in-Figma flags).

### 7.6 PR body template

```markdown
# 🤖 Bridge Docs — DS sync 2026-04-15

> Generated by `.github/workflows/bridge-docs-cron.yml`.
> Run: [${{ github.run_id }}](run-url)

## Detected changes (Figma → KB)

- 🎨 Token `$color/bg/warning` value changed: `#FFA500` → `#FF8800`
- ✨ Component `Banner` gained variant: `inline`
- ⚠️ Token `$color/border/subtle` renamed → `$color/border/muted`

## Cascaded doc updates (9 files)

**Components**
- `design-system/components/feedback/Banner.md` (variant `inline` added)
- `design-system/components/data-display/Card.md` (token ref updated)
- (6 more)

**Foundations**
- `design-system/foundations/color.md` (value updated)

**Migration guides generated**
- `design-system/changelog/migrations/2026-04-15-border-subtle-renamed.md`

## Doc-linter

- ✅ 47/47 code examples parseable
- ✅ 312/312 token refs resolve
- ⚠️ 2 Figma deeplinks 404 — see Button.md L34, Card.md L21

## Preservation

- ✅ `_manual/` directory untouched
- ✅ 3 inline `<!-- manual:... -->` regions preserved

## Review checklist

- [ ] Token renames intentional
- [ ] Banner `inline` variant as intended
- [ ] No unexpected deletions

---

*Next cron run: 2026-04-16 06:00 UTC*
```

### 7.7 Failure modes

| Failure                       | Behavior                                       |
| ----------------------------- | ---------------------------------------------- |
| FIGMA_TOKEN missing/invalid   | Fail fast. Open issue (not PR) with fix steps. |
| Figma API 429 (rate limit)    | Retry with backoff. Fail after 3 tries → issue. |
| Figma API 5xx                 | Retry × 2 → pass (retry next day).             |
| KB diff detected, regen fails | Open issue with error + last known good state. |
| Linter fails                  | PR still opened, labeled `needs-linter-fix`.   |
| No change detected            | Exit 0, no PR, no noise.                       |

---

## 8. The MCP server

### 8.1 Rationale

shadcn/ui proved that docs + CLI + registry as one addressable surface is
the winning pattern for AI-assisted adoption. Bridge's DS MCP server is
the registry + doc surface queryable by any MCP-capable client.

### 8.2 URI scheme

```
ds://component/<name>              → full .md + .json
ds://component/<name>/props        → props table (markdown or json)
ds://component/<name>/tokens       → tokens table
ds://token/<path>                  → token definition + usedBy
ds://pattern/<name>                → pattern doc
ds://foundation/<name>             → foundation doc
ds://index                         → llms.txt content
ds://index/full                    → llms-full.txt content
ds://relationships/<component>     → from _index.json
```

### 8.3 MCP resources

Standard MCP `resources/list` returns the URI set above scoped to the
current repo. `resources/read` returns the markdown and/or JSON body.

### 8.4 Deployment modes

- **Local** (default): the MCP server runs via `bridge-ds docs mcp` and
  binds to stdio. Added to `.bridge/mcp.json` for Claude Code / Cursor /
  Codex / Copilot CLI auto-discovery.
- **Remote** (V1.0+): published as a standalone CLI that any team member
  can run against a checked-out KB, or hosted as a Cloudflare Worker
  reading from the repo's raw GitHub URLs. Out of scope for V0.1.

### 8.5 `.bridge/mcp.json` example

```json
{
  "mcpServers": {
    "bridge-ds": {
      "command": "npx",
      "args": ["@noemuch/bridge-ds", "docs", "mcp"],
      "env": {}
    }
  }
}
```

### 8.6 Comparison to Context7 and alternatives

Context7 proxies public package docs. It cannot serve a private DS or
reflect uncommitted state. Bridge's MCP is repo-local, works offline, and
picks up changes without needing re-indexing.

---

## 9. Skill architecture (restructure)

### 9.1 The six skills

| Skill                           | Layer   | Analogue in v3.1.0                | Mode(s)                |
| ------------------------------- | ------- | --------------------------------- | ---------------------- |
| `using-bridge`                  | process | (monolith header + command map)   | Force-loaded           |
| `generating-figma-design`       | action  | `references/actions/make.md`      | Interactive            |
| `learning-from-corrections`     | action  | `references/actions/fix.md`       | Interactive            |
| `shipping-and-archiving`        | action  | `references/actions/done.md`      | Interactive (triggers ds-docs) |
| `extracting-design-system`      | action  | `references/actions/setup.md`     | Interactive + headless |
| `generating-ds-docs`            | action  | (new)                             | Interactive + headless (cron) |

### 9.2 `using-bridge` (force-loaded)

Installed by `hooks/session-start` (following the SessionStart hook
pattern). Injected at the top of every Claude Code session in the repo.

Frontmatter:

```yaml
---
name: using-bridge
description: >
  Use when any Bridge command is invoked (make, fix, done, setup, docs) or
  any Figma/DS-related design work is requested. Sets command priorities
  and hard rules (compiler-only, semantic tokens only, verification-before-ship).
---
```

Body sections (≤500 tokens):

1. Command map (1-line per skill + when to route there)
2. `<HARD-GATE>` rules:
   - Never write raw Plugin API code
   - Never ship without verification
   - Never hardcode hex/px values
   - Never write docs outside the `generating-ds-docs` skill
3. Skill priority (process first for unclear requests, else direct to action)
4. Red Flags table (rationalization → reality)
5. Reference to `references/verification-gates.md`

### 9.3 Action skills — shared pattern

Each action skill has:

- Frontmatter: `name` (kebab-case) + `description` (triggering conditions
  only, no workflow summary).
- `# Title` + `## Overview` (1-2 sentences).
- `## When to Use` with optional Graphviz flowchart.
- `## Procedure` (numbered steps).
- `<HARD-GATE>` blocks around critical gates.
- `## Red Flags` table.
- `## Verification` section linking to `references/verification-gates.md`.
- Local `references/` subdirectory for skill-specific material.

### 9.4 Shared references

| File                                   | Consumed by                      |
| -------------------------------------- | -------------------------------- |
| `references/compiler-reference.md`     | generating-figma-design, learning-from-corrections |
| `references/transport-adapter.md`      | all skills touching Figma MCP    |
| `references/verification-gates.md`     | all action skills                |
| `references/red-flags-catalog.md`      | using-bridge + action skills     |

### 9.5 Verification gates contract

Three gates, one per stage, all defined in `references/verification-gates.md`:

**Gate A — Compile gate** (before any Figma execute)
- Compiler ran to completion, exit code 0.
- No hardcoded primitives in scene graph JSON.
- All `$token` refs resolve.

**Gate B — Visual gate** (after any Figma execute, before done)
- Screenshot taken in this turn.
- Visual diff checked against spec intent.
- User confirmed visual correctness.

**Gate C — Lint gate** (before any docs PR is opened)
- All code examples parseable.
- All token refs resolve.
- All Figma deeplinks reachable.
- Frontmatter schema validates.
- No provenance markers point to removed sources.

Each action skill states which gates are mandatory at which step. Claude
is told in prose to run the gate and emit evidence (command output, tool
result). Rationalization excuses are enumerated in the gate file with
counter-responses.

### 9.6 `generating-ds-docs` sub-modes

```
generating-ds-docs
├── Mode 1: init                (scaffold the design-system/ tree, run once)
├── Mode 2: full-build          (regenerate everything from KB)
├── Mode 3: sync                (incremental, cascade-driven)
├── Mode 4: check               (lint only)
├── Mode 5: mcp                 (launch MCP server)
└── Mode 6: headless-sync       (cron mode, non-interactive)
```

Each mode is a labeled section inside the SKILL.md with its own
procedure. The skill picks the mode based on the argument passed by the
CLI or the invoking skill (e.g. `shipping-and-archiving` always invokes
Mode 3).

---

## 10. User experience

### 10.1 Mental model (one sentence)

> You design in Figma via Bridge (`make` / `fix` / `done`). Your docs
> live in the same repo, auto-generated from your KB. A cron checks daily
> that Figma and the docs stay aligned. You never need to remember anything.

### 10.2 Three scenarios

**Scenario A — DS maintainer, Monday morning.**

1. Sees GitHub notification: PR #47 `🤖 Bridge Docs — DS sync`.
2. Opens PR. Reads structured body: "Banner gained variant `inline`,
   `$color/bg/warning` value changed, token renamed."
3. Scans 9 file changes in PR diff. Reviews migration guide.
4. Approves and merges. Total time: 2 minutes.
5. Docs stay aligned without anyone remembering anything.

**Scenario B — Designer shipping a new component.**

1. In Claude Code: `make a SelectableRow component with check/radio modes`.
2. `generating-figma-design` runs: CSpec → compile → execute → screenshot.
3. Designer confirms: "Perfect, done".
4. `shipping-and-archiving` runs verification gates A + B.
5. First-ship? Three-question interview (or skipped with Enter).
6. Spec archived, recipe extracted, cascade invokes `generating-ds-docs sync`.
7. New `SelectableRow.md` + `.json` generated, llms.txt updated, changelog
   appended. Commit made locally.
8. Designer pushes. PR-flow or merge-to-main, their choice.

**Scenario C — Consumer dev in acme-web, Cursor.**

1. Cursor's `.cursor/rules/design-system.mdc` loads automatically.
2. Dev writes "Build a confirmation dialog with danger action".
3. Cursor reads `llms.txt`, fetches `Modal.md` and `Button.md`.
4. Generated code uses `variant: danger`, semantic tokens, no hardcoded hex.
5. Or: Cursor queries the MCP server: `ds://component/Modal`, returns
   structured JSON. Same effect, zero string-parsing.

### 10.3 Command surface (three tiers)

**Tier 1 — One-shot CLI bootstrap (rare).**
```
npx @noemuch/bridge-ds init-docs
```

**Tier 2 — Daily work inside Claude Code (unchanged from v3).**
```
setup
make <description>
fix
done
```
Plus new but rarely-typed-directly:
```
docs build
docs sync
docs check
docs mcp
```

**Tier 3 — Automated (invisible).**
```
GitHub Action daily 06:00 UTC → bridge-ds extract --headless → docs sync → PR
```

### 10.4 `_manual/` contract

- The `design-system/_manual/` directory is sacred: no Bridge process
  (cron, done, manual sync) reads or writes inside it.
- Symlinks from generated areas point into `_manual/` so human content
  appears in the public tree.
- Writers edit `.md` files under `_manual/` freely. Commits directly to
  main or via PR; Bridge is unaware.

---

## 11. CLI design language

### 11.1 Stack

- `figlet` (font: `ANSI Shadow`) for the banner.
- `picocolors` for color handling.
- `@clack/prompts` for interactive prompts (`intro`, `select`, `confirm`,
  `password`, `spinner`, `log.step`, `isCancel`, `cancel`).
- Shared conventions from `bridge-app`'s `cli/ui.ts` for visual coherence
  across the Bridge product family.

### 11.2 Brand palette

| Name          | Value              | Usage                           |
| ------------- | ------------------ | ------------------------------- |
| Brand orange  | `#F45B26` (RGB 244,91,38) | Banner, step titles, `brand()` |
| Brand bg      | Same, used as `\x1b[48;2;244;91;38m\x1b[97m` | Intro block `brandBg(" bridge init-docs ")` |
| Success       | `pc.green`         | Spinner success, `✓`            |
| Error         | `pc.red`           | Failures, `✗`                   |
| Warn          | `pc.yellow`        | Soft warnings, `▲`              |
| Dim           | `pc.dim`           | Secondary text, version lines   |
| Bold          | `pc.bold`          | Step numbers (`[1/4]`)          |

Icons:
```
✓ pass   ✗ fail   ◆ info   ▲ warn
```

### 11.3 Banner

```ts
// src/cli/banner.ts
import figlet from "figlet";
import { brand, dim } from "./ui.js";

export function printBanner(tagline: string, version: string) {
  console.log("");
  console.log(brand(figlet.textSync("Bridge", { font: "ANSI Shadow" })));
  console.log(dim(`  v${version} — ${tagline}`));
  console.log("");
}
```

### 11.4 Step pattern

```ts
p.log.step(`${pc.bold("[1/4]")} ${brand("Design System identity")}`);
```

### 11.5 Interactive vs headless detection

```ts
const isInteractive = process.stdout.isTTY && !process.env.CI;
if (isInteractive) {
  printBanner(...);
} else {
  // plain structured logs for CI
}
```

### 11.6 `init-docs` wizard mockup

```
██████╗ ██████╗ ██╗██████╗  ██████╗ ███████╗
██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██╔════╝
██████╔╝██████╔╝██║██║  ██║██║  ███╗█████╗
██╔══██╗██╔══██╗██║██║  ██║██║   ██║██╔══╝
██████╔╝██║  ██║██║██████╔╝╚██████╔╝███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝  ╚═════╝ ╚══════╝

  v4.0.0 — Compiler-driven design system docs

▌ bridge init-docs ▐

├─ [1/4] Design System identity
│
◆  What's your DS called?
│  ✎ Acme DS
│
◆  GitHub repo (for cron PR target)?
│  ✎ acme-corp/acme-design-system
│
├─ [2/4] Figma connection
│
◆  How should the cron talk to Figma?
│  ● Figma Personal Access Token (recommended)
│  ○ Skip — configure later
│
◆  Figma PAT (will be saved as GitHub secret FIGMA_TOKEN):
│  ✎ figd_••••••••••
│
⠋ Validating token...
✓ Token valid. File "Acme DS" found. 89 components detected.
│
├─ [3/4] Cron cadence
│
◆  How often should the cron check for drift?
│  ● Daily — 06:00 UTC (recommended)
│  ○ Weekly — Monday 06:00 UTC
│  ○ Custom cron expression
│
├─ [4/4] Scaffolding
│
⠋ Creating directory structure...
✓ bridge-ds/ (knowledge base)
✓ design-system/ (docs output)
✓ .github/workflows/bridge-docs-cron.yml
✓ .bridge/mcp.json
✓ docs.config.yaml
✓ llms.txt (placeholder)
✓ AGENTS.md
✓ .cursor/rules/design-system.mdc
│
├─ Next steps
│
◆  Open this repo in Claude Code or Cursor and say:
│
│     setup
│
│  Claude will extract your DS from Figma, generate the initial docs
│  (89 components), and make your first commit.
│
│  GitHub Action secret to add before the first cron runs:
│     FIGMA_TOKEN = figd_••••••••••
│  Add at: https://github.com/acme-corp/acme-design-system/settings/secrets
│
◆  Happy designing.
```

### 11.7 `doctor` mockup

Non-interactive diagnostic. No banner if CI. With banner if TTY.

```
bridge-ds doctor

Environment
  ✓ Node.js 20.11.0
  ✓ Git 2.43.0 (repo detected)
  ✓ @noemuch/bridge-ds 4.0.0

Configuration
  ✓ docs.config.yaml
  ✓ bridge-ds/knowledge-base/registries/ (4 files)
  ✓ bridge-ds/specs/history.log (47 entries)
  ✓ _index.json (fresh, 2h old)

Connectivity
  ✓ Figma MCP (console transport)
  ✓ FIGMA_TOKEN (GitHub secret set)
  ▲ MCP server not running (run: bridge-ds docs mcp)

Docs health
  ✓ 89/89 component pages valid
  ✓ llms.txt (89 entries)
  ▲ 2 Figma deeplinks 404 (Button.md L34, Card.md L21)
  ▲ 3 AI-inferred blocks exceed 90-day decay (run: docs sync)

Cron
  ✓ .github/workflows/bridge-docs-cron.yml installed
  ✓ Last run: 2026-04-15 06:00 UTC (success, 1 PR opened)
```

---

## 12. lib/ structure

```
lib/
├── cli/                          (TypeScript, new)
│   ├── main.ts                   entry, routing
│   ├── ui.ts                     brand helpers (port from bridge-app)
│   ├── banner.ts                 figlet banner
│   ├── init-docs.ts              wizard
│   ├── doctor.ts                 diagnostics
│   └── extract.ts                headless extraction entrypoint
├── compiler/                     (existing, JS)
├── extractors/                   (new, TS)
│   ├── figma-mcp.ts              existing MCP path wrapped
│   └── figma-rest.ts             headless REST API extraction
├── kb/                           (new, TS)
│   ├── registry-io.ts            read/write registries
│   ├── index-builder.ts          _index.json generation + patching
│   └── hash.ts                   SHA256 of registries
├── docs/                         (new, TS)
│   ├── generate.ts               orchestrator
│   ├── generators/
│   │   ├── component.ts
│   │   ├── foundation.ts
│   │   ├── pattern.ts
│   │   ├── changelog.ts
│   │   └── migration.ts
│   ├── cascade/
│   │   ├── diff-engine.ts
│   │   ├── impact-analyzer.ts
│   │   └── regen-planner.ts
│   ├── linter.ts
│   ├── mcp-server.ts
│   ├── preservation.ts           _manual/ + inline region handling
│   └── templates/
│       ├── component.md.hbs
│       ├── foundation.md.hbs
│       ├── pattern.md.hbs
│       ├── changelog.md.hbs
│       ├── migration.md.hbs
│       └── llms.txt.hbs
├── cron/                         (new, TS)
│   └── orchestrator.ts           drives headless extract + sync + report
└── scaffold.js                   existing, unchanged (called from cli/init-docs.ts)
```

### 12.1 TypeScript migration policy

- **New code: TypeScript.** Strict mode on.
- **Existing JS code (`lib/compiler/`, `lib/scaffold.js`, `lib/mcp-setup.js`)**:
  stays as-is for V0.1. Progressive migration in follow-up work, not a
  blocker.
- **Build**: `tsc` produces `dist/`. `package.json` `main` + `bin` point
  to `dist/`. Same pattern as `bridge-app`.

---

## 13. Skill migration map (v3.1.0 → v4.0.0)

| Current file (v3.1.0)                                   | New location (v4.0.0)                                              | Action         |
| ------------------------------------------------------- | ------------------------------------------------------------------ | -------------- |
| `skills/design-workflow/SKILL.md` (header + command map + discipline) | `skills/using-bridge/SKILL.md`                           | Extract + rewrite per "description as triggers" rule |
| `skills/design-workflow/references/actions/make.md`     | `skills/generating-figma-design/SKILL.md`                          | Move + upgrade (HARD-GATE, Red Flags, Verification section) |
| `skills/design-workflow/references/actions/fix.md`      | `skills/learning-from-corrections/SKILL.md`                        | Same treatment |
| `skills/design-workflow/references/actions/done.md`     | `skills/shipping-and-archiving/SKILL.md`                           | Same + add ship-time interview + cascade trigger |
| `skills/design-workflow/references/actions/setup.md`    | `skills/extracting-design-system/SKILL.md`                         | Same + add headless mode section |
| `skills/design-workflow/references/actions/drop.md`     | Fold into `using-bridge` (command map only) or keep as small ref   | Simplify       |
| `skills/design-workflow/references/compiler-reference.md` | `references/compiler-reference.md` (repo-level shared)           | Move, keep content |
| `skills/design-workflow/references/transport-adapter.md` | `references/transport-adapter.md`                                 | Move           |
| `skills/design-workflow/references/quality-gates.md`    | `references/verification-gates.md` (superset)                      | Rewrite        |
| `skills/design-workflow/references/templates/`          | `skills/generating-figma-design/references/templates/`             | Move           |
| (new)                                                   | `skills/generating-ds-docs/SKILL.md`                               | Greenfield     |
| (new)                                                   | `references/red-flags-catalog.md`                                  | Greenfield     |
| (new)                                                   | `hooks/session-start`                                              | Greenfield (force-loads using-bridge) |

Compatibility shim: `skills/design-workflow/SKILL.md` stays as a 20-line
redirect during phases P1-P3, pointing users to the new skills. Deleted
in P4.

---

## 14. Phasing

### 14.1 Restructure phases (Bridge architecture)

| Phase | Duration | Risk    | Deliverable                                                  |
| ----- | -------- | ------- | ------------------------------------------------------------ |
| P0    | 0.5d     | Minimal | Description rewrite + HARD-GATE + Red Flags added to existing monolith. No file moves. |
| P1    | 1d       | Low     | `using-bridge` skill + SessionStart hook. Monolith thins.    |
| P2    | 3-4d     | Medium  | Split into 4 action skills. Shared references moved up. Monolith becomes shim. |
| P3    | Inside Bridge Docs V0.1 work | Low | `generating-ds-docs` greenfield. Validates new architecture on a real surface. |
| P4    | 0.5d     | None    | Remove `design-workflow` shim. Bump to v4.0.0.               |

### 14.2 Bridge Docs phases

| Version | Scope                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------- |
| V0.1    | `init-docs` + component/foundation generation + `_index.json` + **cron daily with REST extraction** + MCP server + ship-time interview + `done` cascade sync + Do/Don't from learnings |
| V0.2    | Per-component changelog + migration-guide auto-authoring + provenance decay sweep (weekly hygiene) + Cursor + Copilot config auto-generation polish |
| V0.3    | Pattern pages + category pages + cross-component audits (consistency) + richer REST extraction (instance property bindings) |
| V1.0    | `bridge codemod token-rename` / `component-deprecate` + consumer-repo mode (remote KB) + ADR template integration |

### 14.3 Combined timeline

- Phases run in parallel with Bridge Docs V0.1 work.
- Week 1-2: P0 + P1 + scaffold `generating-ds-docs` (P3 start) + lib/docs/
  cascade skeleton + REST extractor.
- Week 3-4: P2 split + Bridge Docs V0.1 feature work (ship-time interview,
  MCP server, cron workflow).
- Week 5: P4 cleanup + polish + docs self-linting of own repo.
- Week 6: v4.0.0 release.

Total: ~6 calendar weeks for V0.1 + full restructure. Not a sprint
refactor block separate from product work.

---

## 15. Risks and mitigations

| Risk                                          | Mitigation                                                       |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Figma REST API coverage insufficient for V0.1 | Spike in Week 1 to confirm variables + components + styles sufficient. Fall back to interactive-only extraction if blocking. |
| PR fatigue (too many cron PRs)                | `maxPRsPerWeek` cap in config. No-diff = no-PR. Auto-close if superseded. |
| AI-inferred content quality regressions       | Confidence field + decay + linter surface all AI-inferred sections in `doctor` output. Users see what's AI-authored. |
| Breaking changes for existing v3 users        | `design-workflow` shim preserves all user-invocable commands through P1-P3. v4.0.0 is a clean major bump with migration note. |
| Manual preservation drift (lost human content) | Linter fails loudly if inline `<!-- manual:* -->` marker disappears. Content is moved to end-of-file with warning, never deleted. |
| MCP server binding conflicts with Figma MCP   | `.bridge/mcp.json` uses explicit server name `bridge-ds`. No conflict with `figma-console-mcp`. |
| FIGMA_TOKEN leaked                            | Wizard never echoes the token after entry. Stored in GitHub Secrets only. `doctor` only tests it, never prints. |
| Ship-time interview friction                  | All questions skippable with Enter. Silent after first ship unless explicitly re-invoked. |

---

## 16. Success metrics

### 16.1 V0.1 "ready to ship" checklist

- [ ] `npx @noemuch/bridge-ds init-docs` scaffolds a fresh repo end-to-end,
      including a working `.github/workflows/bridge-docs-cron.yml`.
- [ ] `bridge-ds extract --headless` successfully extracts variables,
      components, and styles from a real Figma file using `FIGMA_TOKEN`.
- [ ] Running the cron on the dogfood repo produces a clean no-diff
      exit on day 0, and a diff + PR on day 1 after a deliberate Figma change.
- [ ] `bridge-ds docs build` on the dogfood KB produces 89 component pages,
      all passing the linter.
- [ ] The MCP server `bridge-ds docs mcp` responds to `resources/list`
      and `resources/read` per the URI scheme, verified by a Cursor session.
- [ ] `done` on a new component cascades into docs regeneration, with a
      working ship-time interview.
- [ ] Dogfooded: Bridge's own repo uses Bridge Docs for its own docs.
- [ ] Self-migration: Bridge's own monolith is split into the six skills.

### 16.2 V1.0 "ready" criteria

- Three external teams adopting Bridge Docs for real DSes.
- Codemods working for token-rename and component-deprecate.
- Consumer-repo mode shipping.

---

## 17. Open questions (minimal, non-blocking)

- **Q1**: Should the cron open multiple PRs for independent changesets,
  or batch into one daily PR? V0.1 default: batch. Configurable later.
- **Q2**: Should `_index.json` be committed to git or kept in
  `.bridge/`? V0.1 default: in git (improves PR diff legibility;
  regenerable but useful as a record).
- **Q3**: Multi-DS namespacing in `_index.json` and `llms.txt` — schema
  designed to support `namespace` field, V0.1 leaves it at default
  `"default"` (no migration needed when multi-DS lands in V1.0).

None of these block implementation planning.

---

## 18. Glossary

- **KB** — Knowledge Base (`bridge-ds/knowledge-base/`).
- **CSpec** — Component or Screen Spec (YAML in `bridge-ds/specs/`).
- **Scene graph** — Structured JSON produced by Claude, compiled to Figma
  Plugin API calls.
- **Registry** — Single-domain JSON file in `bridge-ds/knowledge-base/registries/`
  (components, variables, text-styles, icons).
- **Recipe** — Parameterized scene-graph template for a proven layout.
- **Learning** — Correction captured via `fix`; may be promoted to a public
  Do/Don't rule when `frequency ≥ 3 && agreedBy ≥ 2`.
- **Cascade engine** — The diff → impact → regen pipeline.
- **Cascade entry point** — `done` (event), `setup` (explicit), `cron`
  (scheduled), or `bridge-ds docs sync` (manual).
- **Provenance marker** — HTML comment `<!-- source: ... -->` on every
  AI-consumable section.
- **Manual region** — Content under `_manual/` or inside
  `<!-- manual:id --> ... <!-- /manual:id -->` markers, preserved
  across regens.
- **Gate A / B / C** — Compile, Visual, Lint verification gates.

---

## 19. Appendix: Next step

This spec is complete. Implementation planning proceeds in a dedicated
plan document under `docs/plans/`, producing a step-by-step, file-level
plan grounded in §13 (migration map), §14 (phasing), and §12 (lib
structure).
