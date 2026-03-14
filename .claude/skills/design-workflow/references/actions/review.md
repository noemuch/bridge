# Action: review

> Validate the Figma design against the spec. Check structure, tokens, and completeness.

---

## Prerequisites

- Active spec in `specs/active/`
- Figma design generated

---

## Procedure

### 1. Gather artifacts + DS knowledge base

- Read the active spec
- Load knowledge base registries for validation:
  - `references/knowledge-base/registries/components.json` → verify component instances match registry
  - `references/knowledge-base/registries/variables.json` → verify variable bindings use correct names
- Inspect Figma design via MCP:
  ```
  figma_take_screenshot({ node_id: "{nodeId}", file_key: "{fileKey}" })
  figma_get_variables({ file_key: "{fileKey}" })
  ```

### 2. Review checklist

#### A. Spec Compliance

- [ ] All variants/sections from spec are represented in Figma
- [ ] Architecture/layout matches spec diagram
- [ ] Content matches spec examples (or realistic equivalents)

#### B. Design Token Alignment

- [ ] Colors match spec tokens (no arbitrary hex values)
- [ ] Spacing follows token scale strictly (no off-scale values)
- [ ] Typography uses correct styles from the typography scale
- [ ] Radius values match tokens
- [ ] Token naming is semantic (`danger` not `red`, `moderate` not `gray`)
- [ ] Aliasing depth ≤ 2 levels
- [ ] **Variables are bound** (not hardcoded hex/px) — check via Figma inspect
- [ ] Variable names match `registries/variables.json` exactly
- [ ] **ZERO hardcoded hex colors** — every color must use a bound variable (Rule 18)

#### B2. DS Component Reuse Audit (BLOCKING — Rule 18)

Cross-reference every visual element in the design against `registries/components.json`:
- [ ] **Avatars** are DS Avatar instances (not raw ellipses/frames)
- [ ] **Dividers/Separators** are DS Divider instances (not raw rectangles)
- [ ] **Tags/Badges** are DS instances (not raw frames with text)
- [ ] **Buttons** are DS Button instances (not raw frames with text)
- [ ] **Icons** are DS Icon instances (not raw vectors)
- [ ] **Logos** are DS Logo instances
- [ ] Any raw frame is justified with a `// NO DS COMPONENT: {reason}` comment in the script

**If ANY DS component was recreated as raw elements → FAIL. Must be fixed before PASS.**

#### C. Completeness

**Component mode:**
- [ ] All sizes represented
- [ ] All states shown (default, hover, pressed, disabled if applicable)
- [ ] All optional prop combinations demonstrated
- [ ] Advanced compositions shown

**Screen mode:**
- [ ] All sections from spec present
- [ ] All states captured (empty, loading, populated, error)
- [ ] Responsive breakpoints if specified
- [ ] DS components are **real instances** (not placeholder rectangles)
- [ ] No `[MISSING]` placeholder frames remain

#### D. Design Quality

- [ ] Visual hierarchy is clear
- [ ] Spacing rhythm is consistent (follows token scale)
- [ ] Layer naming is semantic in Figma (not "Frame 42" or "Group 1")
- [ ] No orphan or misaligned elements
- [ ] Naming follows DS conventions: `{category}/{role}/{emphasis}`

#### E. Visual Fidelity (BLOCKING)

**Load before checking:**
- `references/knowledge-base/guides/design-patterns.md`
- The reference screenshots used during design generation

**Compare the generated design with the reference screenshots and pattern rules:**

- [ ] **Layout match** — Zones are in the correct positions (sidebar, content, header, footer)
- [ ] **Proportion match** — Relative widths/heights of zones match the pattern
- [ ] **Density match** — Information density is similar (not too sparse, not too crammed)
- [ ] **Hierarchy match** — Visual weight of title, sections, CTAs matches product's existing hierarchy
- [ ] **Card patterns match** — Card size, grid rhythm, gaps, internal layout follow the design patterns
- [ ] **Navigation match** — Sidebar/stepper/tabs follow the correct pattern for this screen type
- [ ] **Section organization** — Consistent spacing between sections, titles properly placed
- [ ] **Whitespace balance** — Margins and breathing room consistent with product density

**If any check fails:** identify the specific gap, reference the pattern rule that was violated, and suggest the fix.

#### F. Component API Quality (component mode)

- [ ] Is the composition pattern the right one? (slots vs config vs compound)
- [ ] Could the props surface be smaller?
- [ ] Is the component reusable beyond its primary use case?

### 3. Report

```markdown
## Review: {name}

### Spec Compliance: {OK / ISSUES}
{findings}

### Token Alignment: {OK / ISSUES}
{findings}

### Completeness: {OK / ISSUES}
{missing items}

### Design Quality: {OK / ISSUES}
{findings}

### Visual Fidelity: {OK / ISSUES}
Pattern matched: {pattern name}
Screenshots compared: {list}
{findings — specific gaps with pattern rule references}

### Verdict: PASS / NEEDS ITERATION

### Iteration needed:
1. {what to fix}
```

### 4. Iterate if needed

If NEEDS ITERATION:
1. Fix issues via `figma_execute` scripts (read `references/figma-api-rules.md` for patterns)
2. Re-review only the fixed areas

Repeat until PASS.

---

## Transition

When review passes → suggest: "Review passed. Run: `done`"
