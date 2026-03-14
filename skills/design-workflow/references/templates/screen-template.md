# {ScreenName}

## Description

{What screen, user goal, context of use.}

**Figma:** {figma_url}

---

## Reference Screen (REQUIRED)

> A screen that already exists in Figma with the same layout shell (sidebar + content, topbar + main, etc.).
> Claude will clone the shell from this reference and replace the content.
> **Without a reference, generation is significantly less reliable.**

| | |
|---|---|
| **Reference URL** | {Figma URL of an existing screen with the same shell/layout} |
| **Reference node ID** | {nodeId extracted from URL} |
| **Shell elements to clone** | {list: e.g., "sidebar frame, product background, stepper, footer"} |
| **What changes vs reference** | {what content/sections differ from the reference} |

> If no existing screen uses this layout: write "None — new layout, building from scratch" and document the shell structure in detail in Layout Structure below.

---

## Visual Reference

> Identifies which design pattern this screen follows.
> The layout structure below MUST be based on these references.

| | |
|---|---|
| **Pattern** | {pattern name from `design-patterns.md`} |
| **Screenshots studied** | {list of screenshot filenames, min 2} |
| **Key composition rules** | {bullet list of specific rules from the pattern that apply} |

**Composition notes:**
{What was observed in the screenshots that informs this spec's layout: zone proportions, content density, visual hierarchy, navigation pattern, card rhythm, etc.}

---

## Layout Structure

> Based on the matched pattern above. The diagram MUST reflect the pattern's zone placement and proportions.

```
┌─────────────────────────────────────────┐
│  Header                                 │
├───────────┬─────────────────────────────┤
│  Sidebar  │  Content Area               │
│           │                             │
│           │                             │
├───────────┴─────────────────────────────┤
│  Footer                                 │
└─────────────────────────────────────────┘
```

---

## Sections

### {SectionName}
- **Purpose**: {what this section shows}
- **DS Components used**: {Component (variant, size)}
- **Content**: {what data is displayed}
- **Behavior**: {interactions, scroll, collapse...}

---

## States

| State | Description |
|-------|-------------|
| Empty | {what shows when no data} |
| Loading | {skeleton, spinner...} |
| Populated | {normal state with data} |
| Error | {error message, retry action} |

---

## DS Components Used

> Look up component keys in `knowledge-base/registries/components.json`.
> Use `knowledge-base/guides/components/overview.md` decision tree to choose the right component.
> Mark each element as `import` (from DS library) or `clone` (from reference screen).

| Component | Variant/Size | Key / Source | Strategy | Location |
|-----------|-------------|-------------|----------|----------|
| `{Name}` | {variant} | {registry key or "reference node {id}"} | import / clone | {section} |

**Strategy guide:**
- `import` — Component exists in DS library → use `importComponentByKeyAsync(key)`
- `clone` — Component is local/unpublished or pre-configured in reference → clone from reference node

---

## New DS Components Required

> List any UI patterns in this screen that are NOT covered by existing DS components.
> Each one will need its own `spec {component}` → `design` → `done` cycle BEFORE this screen is designed.
> If none, write "None — all patterns covered by existing DS components."

| Component Name | Used in Section | Description | Variants Needed |
|---------------|----------------|-------------|-----------------|
| `{Name}` | {section} | {what it does, why existing components don't cover it} | {list of variants/states} |

---

## Content Structure

{Realistic data examples for each section}

---

## Design Tokens

### Layout
| Token | Value | Usage |
|-------|-------|-------|
| `{token}` | {value} | {usage} |

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `{token}` | {value} | {usage} |

---

## Responsive Rules

| Breakpoint | Layout change |
|-----------|---------------|
| Desktop (>1024px) | {layout} |
| Tablet (768-1024px) | {layout} |
| Mobile (<768px) | {layout} |

---

## Acceptance Criteria

- [ ] {criterion}

---

## Open Questions

1. {question}
