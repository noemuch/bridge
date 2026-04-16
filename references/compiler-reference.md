# Compiler Reference — Bridge DS v3

> **The only reference Claude reads at design-time.**
> The compiler enforces all 26 Figma API rules. Claude's job: produce a valid scene graph JSON.

---

## 1. Scene Graph JSON Format

### Root Document

```json
{
  "version": "3.0",
  "metadata": {
    "name": "Screen Name",
    "width": 1440,
    "height": 900,
    "description": "Optional description",
    "transport": "console",
    "fileKey": "abc123"
  },
  "fonts": [
    { "family": "Inter", "style": "Regular" },
    { "family": "Inter", "style": "Semi Bold" }
  ],
  "nodes": [ ... ]
}
```

- `transport` and `fileKey` are optional (auto-detected; `fileKey` required for official transport).
- `fonts` must list every font family+style used by text styles in the design.
- `nodes` are the top-level children of the root frame.

### Token Reference Format

All spacing, color, radius, text style, and effect values MUST be `$token` references — never raw `px` or hex.

```
$spacing/md              → variable: spacing/medium
$color/bg/neutral/default → variable: color/background/neutral/default
$radius/lg               → variable: radius/large
$text/heading/xl         → text style: heading/xl
$effect/shadow/sm        → effect style: shadow/small
$comp/Button             → component: Button
$icon/ArrowRight         → icon component: ArrowRight
```

**Alias shortcuts** (expanded automatically by the compiler):

| Alias | Expands to |
|-------|-----------|
| `bg` | `background` |
| `fg` | `foreground` |
| `xs` | `xsmall` |
| `sm` | `small` |
| `md` | `medium` |
| `lg` | `large` |
| `xl` | `xlarge` |
| `xxl` | `xxlarge` |

---

## 2. Node Type Quick Reference

All nodes share these base properties: `type`, `name`, `id?`, `children?`, `fillH?`, `fillV?`, `absolute?`, `visible?`, `opacity?`.

| Type | Required | Key Properties | Maps To |
|------|----------|---------------|---------|
| **FRAME** | `name` | `layout`, `gap`, `padding`, `fill`, `stroke`, `radius`, `clip`, `width`, `height`, `primaryAxisSizing`, `counterAxisSizing`, `primaryAxisAlign`, `counterAxisAlign`, `effectStyle`, `children` | `figma.createFrame()` |
| **TEXT** | `name`, `characters`, `textStyle` | `fill`, `autoResize`, `maxLines` | `figma.createText()` |
| **INSTANCE** | `name`, `component` | `variant`, `properties`, `swaps` | `importComponentByKeyAsync` / `importComponentSetByKeyAsync` + `createInstance()` |
| **CLONE** | `name`, one of `sourceNodeId` / `sourceRef` | `overrides[]` (each: `find.name`, `set.*`) | `node.clone()` |
| **RECTANGLE** | `name`, `width`, `height` | `fill`, `stroke`, `strokeWeight`, `strokeAlign`, `radius` | `figma.createRectangle()` |
| **ELLIPSE** | `name`, `width`, `height` | `fill`, `stroke`, `strokeWeight` | `figma.createEllipse()` |
| **REPEAT** | `name`, `count`, `template[]` | `data[]` (per-iteration bindings, `{{key}}` in characters) | Expands to N copies (not a Figma node) |
| **CONDITIONAL** | `name`, `when` | `children`, `else?` | Include/exclude (not a Figma node) |

---

## 3. FRAME Properties Detail

```json
{
  "type": "FRAME",
  "name": "Sidebar",
  "layout": "VERTICAL",
  "gap": "$spacing/md",
  "padding": "$spacing/lg",
  "fill": "$color/bg/neutral/default",
  "radius": "$radius/md",
  "clip": true,
  "fillH": true,
  "fillV": true,
  "width": 300,
  "height": 600,
  "primaryAxisSizing": "AUTO",
  "counterAxisSizing": "FIXED",
  "primaryAxisAlign": "MIN",
  "counterAxisAlign": "CENTER",
  "stroke": "$color/border/neutral/default",
  "strokeWeight": 1,
  "strokeAlign": "INSIDE",
  "children": [ ... ]
}
```

- `padding` is shorthand for all four sides. Use `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` for asymmetric padding.
- `radius` is shorthand for all corners. Use `radiusTopLeft`, etc. for individual corners.
- `width`/`height` set initial `resize()` dimensions. Sizing modes (`primaryAxisSizing`, `counterAxisSizing`) control whether the frame grows.

---

## 4. Component Usage

### INSTANCE Node

```json
{
  "type": "INSTANCE",
  "name": "Primary Button",
  "component": "Button",
  "variant": { "size": "large", "variant": "primary" },
  "properties": { "label": "Submit", "hasTrailingIcon": true },
  "swaps": { "leadingIcon": "IconArrowRight" },
  "fillH": true
}
```

- `component`: name from the DS registry (case-insensitive).
- `variant`: object of variant property keys to values. The compiler validates against known variant options.
- `properties`: text and boolean overrides. The compiler handles hash-suffix property key resolution.
- `swaps`: instance swap overrides. Values are component names resolved to keys.
- INSTANCE nodes CANNOT have `children` (compiler error).

### CLONE Node

```json
{
  "type": "CLONE",
  "name": "Sidebar Copy",
  "sourceRef": "sidebar",
  "overrides": [
    {
      "find": { "name": "Title", "type": "TEXT" },
      "set": { "characters": "New Title", "fill": "$color/text/accent/default" }
    }
  ]
}
```

- Use `sourceRef` to reference another node's `id` field (local clone).
- Use `sourceNodeId` for Figma node IDs (reference-based or unpublished components).

---

## 5. Compiler Invocation

```bash
bridge-ds compile --input <json-file> --kb <kb-path> --transport <console|official> [--dry-run]
```

*(Equivalent: `node dist/lib/compiler/cli.js ...` after `npm run build`.)*

**Output:** JSON array of `{ id, code, description }` chunks to stdout.
**Errors:** Structured errors to stderr with fuzzy suggestions for unresolved tokens/components.

### Pipeline

```
Input JSON → PARSE → RESOLVE → VALIDATE → PLAN → CODEGEN → WRAP → Output chunks
```

The compiler handles: JSON validation, token resolution, structural validation (FILL in AUTO parent, raw shapes matching DS components, orphan clones), chunking for large designs, code generation with all 26 Figma API rules enforced, and transport-specific wrapping.

---

## 6. Claude's Workflow

1. **Read** CSpec YAML (from spec phase) or generate from user description.
2. **Convert** to scene graph JSON (`nodes` array with `$token` references).
3. **Write** JSON to a temp file.
4. **Run** the compiler: `bridge-ds compile --input /tmp/scene.json --kb <kb-path> --transport console`.
5. **Execute** each output chunk via `figma_execute` (console) or `use_figma` (official).
6. **Screenshot** after the final chunk to verify the result.

---

## 7. Key Rules

These are the rules Claude must follow when producing scene graph JSON. The compiler enforces them — but producing correct input avoids round-trips.

1. **Every spacing/padding/radius** MUST be a `$token` ref (never raw px values).
2. **Every color** (fill, stroke) MUST be a `$token` ref (never hex values).
3. **Every TEXT node** MUST have a `textStyle` ref (never hardcode font properties).
4. **DS components** MUST be INSTANCE nodes (never recreate as FRAME/RECTANGLE).
5. **INSTANCE nodes** CANNOT have children — use `properties` and `swaps` for overrides.
6. **Node names** become Figma layer names — make them descriptive and unique within their parent.
7. **Use REPEAT** for lists and grids with repeated structure.
8. **Use CONDITIONAL** sparingly — prefer resolving conditions before producing the scene graph.
9. **RECTANGLE/ELLIPSE** are only for raw decorative elements with no DS component equivalent.
10. **`fillH`/`fillV`** should not be used on children of frames with `primaryAxisSizing: "AUTO"` (causes collapsed layout).

---

## 8. Error Handling

If the compiler returns errors:

1. **Read** the error messages and suggestions from stderr.
2. **Fix** the scene graph JSON based on the suggestions.
3. **Re-run** the compiler.

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `RESOLVE_TOKEN_NOT_FOUND` | Token path doesn't match any registry entry | Check spelling, use aliases (`md` not `medium`), verify token exists in KB |
| `RESOLVE_COMPONENT_NOT_FOUND` | Component name not in registry | Check registry for exact name (case-insensitive) |
| `RESOLVE_VARIANT_INVALID` | Variant key or value not recognized | Check component's known variant properties |
| `VALIDATE_FILL_IN_AUTO_PARENT` | `fillH`/`fillV` on child of AUTO-sized parent | Change parent to `FIXED` sizing or remove fill on child |
| `VALIDATE_RAW_SHAPE_HAS_DS_MATCH` | RECTANGLE/ELLIPSE name matches a DS component | Use INSTANCE node instead |
| `VALIDATE_TEXT_NO_STYLE` | TEXT node missing `textStyle` | Add a `$text/...` reference |
| `VALIDATE_INSTANCE_HAS_CHILDREN` | INSTANCE node has `children` array | Remove children, use `properties`/`swaps` instead |
| `PARSE_RAW_VALUE_NOT_ALLOWED` | Raw number in spacing/radius/color field | Replace with `$token` reference |
