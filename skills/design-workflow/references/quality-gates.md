# Quality Gates

---

## Phase: setup (STEP 0)

| Gate | Blocking | Check |
|------|----------|-------|
| Figma MCP transport available | Yes (before design) | Console: `figma_get_status()` returns valid connection / Official: `whoami()` succeeds (see transport-adapter.md Section F) |
| Connected to Figma | Yes (before design) | Console: `setup.valid: true` / Official: `whoami()` + test `use_figma` call |
| DS libraries enabled | Yes (before design) | User confirmation |
| Knowledge base exists | Yes (before spec) | `registries/` has JSON files |
| Registry schemas followed | Yes | All registry files match schemas in `schemas/` — every entry has `key` field |
| Registry keys validated | Yes | Sample import test passed via `figma_execute` (3-5 keys per registry) |
| No node IDs as keys | Yes | Component entries have `key` (hex hash), NOT just `id` (node ID like `1008:174`) |
| Variable keys present | Yes | Variables have `key` field, not just `name` paths |

---

## Phase: spec → design (STEP 2)

| Gate | Blocking | Check |
|------|----------|-------|
| Spec has clear scope (component or screen) | Yes | Mode identified |
| Spec has description (what, user goal, context) | Yes | Non-empty |
| Spec has design tokens section | Yes | Tokens referenced |
| Spec has acceptance criteria | Yes | At least 3 checkboxes |
| Spec has Figma URL | No | Can be added later |

### Component-specific
| Gate | Blocking |
|------|----------|
| Props API defined | Yes |
| Architecture diagram present | Yes |
| Variant names listed | Yes |

### Screen-specific
| Gate | Blocking |
|------|----------|
| Layout structure defined | Yes |
| Sections breakdown present | Yes |
| DS components identified | Yes |
| "New DS Components Required" section filled | Yes |

---

## Phase: new components resolution (STEP 3)

| Gate | Blocking | Check |
|------|----------|-------|
| All listed new components have been spec'd | Yes | Spec exists in `specs/shipped/` or `specs/active/` |
| All listed new components have been designed in Figma | Yes | Design generated and reviewed |
| All listed new components passed review | Yes | Review verdict = PASS |

---

## Phase: pattern matching (STEP 3b)

| Gate | Blocking | Check |
|------|----------|-------|
| Pattern identified from `design-patterns.md` | Yes | Pattern name logged |
| Min 2 reference screenshots read and analyzed | Yes | Screenshot filenames logged |
| Pattern rules extracted and documented | Yes | Bullet list of rules to apply |
| If no pattern matches: user confirmed closest pattern | Yes | Explicit user choice |

---

## Phase: design generation (STEP 4)

| Gate | Blocking | Check |
|------|----------|-------|
| **Atomic generation** | **Yes** | Full mode: design split into 4-6 sequential scripts (~30-80 lines each). Quick mode: 1-2 consolidated scripts (~100-200 lines) with upfront audit (see quick.md) |
| **Screenshot verification between steps** | **Yes** | `figma_take_screenshot` called after EACH atomic step, issues fixed before proceeding |
| **Pre-script element audit (Rule 18)** | **Yes** | Before EACH script: list every visual element, verify against registries. NEVER recreate a DS component as raw frame |
| **Registry loaded before first script** | **Yes** | `components.json` and other registries read and available before writing any generation script |
| **Zero hardcoded hex colors** | **Yes** | Every color uses `setBoundVariableForPaint` or `setBoundVariable` with registry variables |
| **Canvas positioning (Rule 19)** | **Yes** | Components positioned with 80px+ gaps, never stacked at (0,0) |

---

## Phase: design → review (STEP 4 → 5)

| Gate | Blocking | Check |
|------|----------|-------|
| Figma design exists | Yes | Generated via figma_execute |
| Canvas width correct | Yes | 1440px (web), 390px (mobile), 1024px (tablet) |
| Component properties exposed | Yes (component mode) | All text = TEXT prop, all icons = INSTANCE_SWAP, optionals = BOOLEAN |
| **No interaction state variants** | **Yes** | Hover/pressed/disabled handled via prototyping, NOT as separate variants |
| **Variants arranged in grid** | **Yes (component mode)** | Variants positioned in readable grid after `combineAsVariants()`, not stacked |
| **Zero raw elements (Rule 18)** | **Yes** | Every visible element checked against registries before creation. Raw frames/text only if justified. **FAIL if Avatar, Divider, Tag, Badge, or Button recreated as raw element** |
| **Design follows matched pattern layout** | **Yes** | Zones, proportions match pattern rules |
| **Content density matches reference** | **Yes** | Similar item count, whitespace balance |

---

## Phase: review — visual fidelity (STEP 5)

| Gate | Blocking | Check |
|------|----------|-------|
| **Layout match** | Yes | Zones in correct positions per pattern |
| **Proportion match** | Yes | Relative widths/heights match pattern |
| **Density match** | Yes | Information density similar to reference screenshots |
| **Hierarchy match** | Yes | Visual weight of titles, sections, CTAs matches product patterns |
| **Card pattern match** | Yes (if cards present) | Size, grid, rhythm, internal layout per design patterns |
| **Navigation match** | Yes | Sidebar/stepper/tabs follow correct pattern |
| **Section organization** | Yes | Consistent spacing between sections, titles properly placed |
| **Whitespace balance** | Yes | Margins and breathing room consistent with product density |

---

## Phase: review → done (STEP 6)

| Gate | Blocking | Check |
|------|----------|-------|
| All variants/sections in Figma | Yes | Matches spec list |
| Tokens correctly applied | Yes | No arbitrary values, variables bound |
| DS component instances (not raw frames) | Yes | Real instances from library |
| Visual fidelity review passed | Yes | All visual gates = PASS |
| User validated design | Yes | Explicit approval |
| All acceptance criteria met | Yes | Checkboxes checked |

---

## Phase: learn (after design corrections)

| Gate | Blocking | Check |
|------|----------|-------|
| Active spec exists | Yes | `specs/active/{name}-spec.md` present |
| Snapshot exists | Yes | `specs/active/{name}-snapshot.json` present |
| Figma MCP transport available | Yes | Console: `figma_get_status()` / Official: `whoami()` (see transport-adapter.md) |
| Root node still exists | Yes | Plugin API execution can find the node from snapshot meta |
| Changes classified | Yes | Every change classified as LEARNING or FLAG |
| Learnings have valid tokens | Yes | Every LEARNING references a token from `registries/variables.json` |
| Flags surfaced to user | Yes | All FLAG items reported before saving |

---

## Phase: sync (DS incremental update)

| Gate | Blocking | Check |
|------|----------|-------|
| Knowledge base exists | Yes | `registries/` has JSON files |
| Figma MCP transport available | Yes | Console: `figma_get_status()` / Official: `whoami()` (see transport-adapter.md) |
| Diff computed before apply | Yes | Report shown to user before any registry modification |
| Breaking changes confirmed | Yes (if removals) | User explicitly approves deletion of removed items |
| Registry validation after update | Yes | Sample import test passes (3-5 keys per registry) |
| Guides patched for removals | Yes (if removals) | No guide references deleted components/tokens |

---

## Skip Policy

- **Non-skippable (NEVER):** spec creation, spec validation, new components check, pattern matching, visual fidelity review, DS component reuse audit (Rule 18), pre-script element audit, registry loading
- **Skippable with warning:** Figma URL in spec, individual structural review sub-checks
- When skipping:
  1. Warn user about quality impact
  2. Log the skip reason
  3. Flag in review as advisory issue

---

## Phase: Quick Mode

Quick mode relaxes some gates while keeping critical ones:

### Relaxed (non-blocking in quick mode)
- Pattern matching: best-effort, not blocking
- Spec creation and validation: skipped entirely
- New components check: skipped (use what exists in registries)
- Formal review: skipped (user can run separately)
- Acceptance criteria: none (no spec)

### Still enforced (BLOCKING even in quick mode)
- Upfront element audit (Rule 18) — all elements audited once before generation (replaces per-script audits)
- Zero hardcoded hex colors — all colors via setBoundVariableForPaint
- Consolidated generation — 1-2 scripts with upfront audit + screenshot verification
- DS component reuse — NEVER recreate existing components as raw frames
- Registry loading — must load and cross-reference before generating
- Canvas positioning — 80px+ gaps, no stacking at (0,0)
- Script structure — follow figma-api-rules.md (Rule 17 / Rule 23)
