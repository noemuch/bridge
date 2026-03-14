# {ComponentName} Component

## Description

Implement a **{description}**. {Design principle justification}.

| Level | Component | Role | Props |
|-------|-----------|------|-------|
| 1 — Primitive | `{Primitive}` | {role} | {count} |
| 2 — Blocks | `{Block1}`, `{Block2}` | {role} | {count} |
| 3 — Composition | `{Composed}` | {role} | {count} |

**Figma:** {figma_url}

**Design principle:** {principle} — {explanation}.

---

## Visual Reference (recommended)

> If this component appears in existing screens, document which patterns/screenshots show similar components.
> This helps the `design` step match proportions, density, and visual weight.

| | |
|---|---|
| **Closest pattern** | {pattern name or "N/A — new pattern"} |
| **Screenshots** | {screenshot filenames showing similar components, or "N/A"} |
| **Composition notes** | {what to match: card size, internal spacing rhythm, visual weight relative to surroundings} |

---

## Architecture Overview

```
┌─ {Composed} (convenience wrapper) ──────────────────────┐
│                                                          │
│  ┌─ {Primitive} (layout primitive) ───────────────────┐  │
│  │                                                     │  │
│  │  [leading]       [children]         [trailing]      │  │
│  │  {LeadSlot}      {ContentSlot}      {TrailSlot}     │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Level 1 — `{Primitive}`

### Props API

```typescript
interface {Primitive}Props {
  /** {description} */
  {prop}: {type};
}
```

### Layout Specs

| Property | Value | Token |
|----------|-------|-------|
| {property} | {value} | `{token}` |

---

## Level 2 — `{Block}`

### Props API

```typescript
interface {Block}Props {
  /** {description} */
  {prop}: {type};
}
```

### Typography & Colors

| Element | Typography | Color |
|---------|-----------|-------|
| {element} | `{token}` | `{token}` |

---

## Level 3 — `{Composed}`

### Props API

```typescript
interface {Composed}Props {
  /** {description} */
  {prop}: {type};
}
```

### Usage Examples

```tsx
<{Composed} {props} />
```

---

## Design Tokens Summary

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `{token}` | {value} | {usage} |

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `{token}` | {value} | {usage} |

### Typography

| Token | Specs | Usage |
|-------|-------|-------|
| `{token}` | {specs} | {usage} |

---

## Component Properties (Figma)

> Define ALL configurable properties for the Figma component.
> Every text, icon, and optional element must be exposed.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `{name}` | TEXT | {default} | {what it controls} |
| `{name}` | INSTANCE_SWAP | {default component} | {what icon/sub-component it swaps} |
| `{name}` | BOOLEAN | {true/false} | {what element it shows/hides} |

---

## Interaction States

| State | Token | Visual |
|-------|-------|--------|
| Default | — | Base appearance |
| Hovered | `color/interaction/hovered` | Overlay on base background |
| Pressed | `color/interaction/pressed` | Overlay on base background |
| Disabled | `color/interaction/disabled` | Overlay + reduced interactivity |

---

## Reused DS Components

| Component | Available | Usage |
|-----------|-----------|-------|
| `{Name}` | {platforms} | {usage} |

---

## Acceptance Criteria

- [ ] All variants exist in Figma as component variants
- [ ] All design tokens correctly applied (no hardcoded values)
- [ ] All typography, colors, and spacing match spec
- [ ] Component properties exposed (TEXT, INSTANCE_SWAP, BOOLEAN)
- [ ] {criterion}

---

## Open Questions

1. {question}
