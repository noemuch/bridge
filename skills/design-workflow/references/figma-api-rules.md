# Figma Plugin API — Mandatory Rules

> **This file MUST be read before writing ANY Figma generation script.**
> Every rule here was learned from real bugs. Breaking them = broken layout.
>
> **Note:** Variable keys, text style keys, and component keys vary per design system.
> Always load them from your project's `knowledge-base/registries/` directory.

---

## Rule 1: FILL after appendChild (CRITICAL)

`layoutSizingHorizontal = "FILL"` and `layoutSizingVertical = "FILL"` **ONLY work on children of auto-layout frames**. Setting FILL before `appendChild()` throws an error.

```js
// WRONG — crashes
child.layoutSizingHorizontal = "FILL";
parent.appendChild(child);

// CORRECT
parent.appendChild(child);
child.layoutSizingHorizontal = "FILL";
```

**Helper:**
```js
function appendFill(parent, child, fillH, fillV) {
  parent.appendChild(child);
  if (fillH) child.layoutSizingHorizontal = "FILL";
  if (fillV) child.layoutSizingVertical = "FILL";
}
```

---

## Rule 2: Absolute positioning after appendChild

`layoutPositioning = "ABSOLUTE"` requires the node to already be inside an auto-layout parent.

```js
// CORRECT
parent.appendChild(circle);
circle.layoutPositioning = "ABSOLUTE";
circle.x = 100; circle.y = 50;
```

---

## Rule 3: FILL + AUTO parent = collapsed layout

A child with `FILL` inside a parent with `primaryAxisSizingMode = "AUTO"` collapses to 0px. The parent must be FIXED for FILL children.

```js
// CORRECT
root.primaryAxisSizingMode = "FIXED";
root.resize(1440, 900);
// then after appendChild:
mainArea.layoutSizingVertical = "FILL";
```

---

## Rule 4: resize() overrides sizing modes (CRITICAL)

`resize(width, height)` forces **both** axes to `"FIXED"`. Set sizing modes AFTER resize.

```js
// CORRECT
frame.resize(700, 10);
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "FIXED";
```

---

## Rule 5: counterAxisAlignItems for cross-axis centering

| Layout mode | primaryAxisAlignItems controls | counterAxisAlignItems controls |
|-------------|-------------------------------|-------------------------------|
| VERTICAL | Vertical alignment | Horizontal alignment |
| HORIZONTAL | Horizontal alignment | Vertical alignment |

```js
// Center children horizontally in a vertical layout
container.layoutMode = "VERTICAL";
container.counterAxisAlignItems = "CENTER";
```

---

## Rule 6: Always bind spacing variables (NEVER hardcode px)

Every padding, gap, and radius value MUST use `setBoundVariable()` with a spacing token from the registry.

**Load spacing keys from `registries/variables.json`.** Look for variables with names like `layout/spacing/*` and `layout/radius/*`.

```js
// Load spacing vars once at script start (keys from your registries/variables.json)
var spLarge = await figma.variables.importVariableByKeyAsync("YOUR_SPACING_LARGE_KEY");
var spMedium = await figma.variables.importVariableByKeyAsync("YOUR_SPACING_MEDIUM_KEY");
var radMedium = await figma.variables.importVariableByKeyAsync("YOUR_RADIUS_MEDIUM_KEY");

// Bind to frame
frame.setBoundVariable('itemSpacing', spMedium);
frame.setBoundVariable('paddingTop', spLarge);
frame.setBoundVariable('paddingBottom', spLarge);
frame.setBoundVariable('paddingLeft', spLarge);
frame.setBoundVariable('paddingRight', spLarge);
```

**Helper:**
```js
function bindPadding(frame, top, right, bottom, left) {
  if (top) frame.setBoundVariable("paddingTop", top);
  if (right) frame.setBoundVariable("paddingRight", right);
  if (bottom) frame.setBoundVariable("paddingBottom", bottom);
  if (left) frame.setBoundVariable("paddingLeft", left);
}

function bindRadius(frame, radiusVar) {
  frame.setBoundVariable("topLeftRadius", radiusVar);
  frame.setBoundVariable("topRightRadius", radiusVar);
  frame.setBoundVariable("bottomLeftRadius", radiusVar);
  frame.setBoundVariable("bottomRightRadius", radiusVar);
}
```

---

## Rule 7: Colors via setBoundVariableForPaint (not setBoundVariable)

Fills and strokes use a **different API** than layout properties.

```js
// WRONG
frame.setBoundVariable('fills', colorVar);

// CORRECT
function mf(colorVar) {
  var p = figma.util.solidPaint("#000000");
  p = figma.variables.setBoundVariableForPaint(p, "color", colorVar);
  return [p];
}
frame.fills = mf(myColorVar);
```

**Load color keys from `registries/variables.json`.** Look for variables with names like `color/background/*`, `color/text/*`, `color/border/*`.

---

## Rule 8: Text styles via importStyleByKeyAsync (NEVER hardcode fonts)

Never set `fontName`, `fontSize`, or `lineHeight` manually. Always use text styles from the library.

```js
// WRONG
text.fontName = { family: "Inter", style: "Bold" };
text.fontSize = 32;

// CORRECT (key from registries/text-styles.json)
var style = await figma.importStyleByKeyAsync("YOUR_TEXT_STYLE_KEY");
await text.setTextStyleIdAsync(style.id);  // MUST use async version — see Rule 21
```

**Load text style keys from `registries/text-styles.json`.** Always use `setTextStyleIdAsync()`, not `textStyleId =`.

---

## Rule 9: Component properties — add, bind, and override

### 9a. addComponentProperty AFTER combineAsVariants

```js
var compSet = figma.combineAsVariants(components, figma.currentPage);
compSet.addComponentProperty('title', 'TEXT', 'Default title');
```

### 9b. Bind TEXT properties to text nodes

```js
var titlePropKey = Object.keys(compSet.componentPropertyDefinitions)
  .find(k => compSet.componentPropertyDefinitions[k].type === "TEXT" && k.startsWith("title"));

for (var i = 0; i < compSet.children.length; i++) {
  var variant = compSet.children[i];
  var titleNode = variant.findOne(n => n.name === "title" && n.type === "TEXT");
  if (titleNode && titlePropKey) {
    titleNode.componentPropertyReferences = { characters: titlePropKey };
  }
}
```

### 9c. Override TEXT properties on instances

```js
var instance = variant.createInstance();
var propDefs = compSet.componentPropertyDefinitions;
for (var key in propDefs) {
  if (key.startsWith("title") && propDefs[key].type === "TEXT") {
    instance.setProperties({ [key]: "My custom title" });
  }
}
```

### 9d. INSTANCE_SWAP properties for icons

```js
compSet.addComponentProperty('icon', 'INSTANCE_SWAP', defaultIconId);
var iconPropKey = Object.keys(compSet.componentPropertyDefinitions)
  .find(k => k.startsWith("icon") && compSet.componentPropertyDefinitions[k].type === "INSTANCE_SWAP");

for (var i = 0; i < compSet.children.length; i++) {
  var variant = compSet.children[i];
  var iconNode = variant.findOne(n => n.name === "icon" && n.type === "INSTANCE");
  if (iconNode && iconPropKey) {
    iconNode.componentPropertyReferences = { mainComponent: iconPropKey };
  }
}
```

### 9e. BOOLEAN properties for visibility

```js
compSet.addComponentProperty('showButton', 'BOOLEAN', true);
var btnPropKey = Object.keys(compSet.componentPropertyDefinitions)
  .find(k => k.startsWith("showButton"));

for (var i = 0; i < compSet.children.length; i++) {
  var variant = compSet.children[i];
  var btnNode = variant.findOne(n => n.name === "button");
  if (btnNode && btnPropKey) {
    btnNode.componentPropertyReferences = { visible: btnPropKey };
  }
}
```

---

## Rule 10: Property keys include hash suffix

`componentPropertyDefinitions` returns keys like `title#9311:226`. Use the **full key** (with hash).

```js
function findPropKey(compSet, prefix, type) {
  var defs = compSet.componentPropertyDefinitions;
  return Object.keys(defs).find(function(k) {
    return k.startsWith(prefix) && defs[k].type === type;
  });
}
var titleKey = findPropKey(compSet, "title", "TEXT");
```

---

## Rule 11: importComponentSetByKeyAsync vs importComponentByKeyAsync

| What | API |
|------|-----|
| Component with variants (Button, Tag) | `importComponentSetByKeyAsync` |
| Single component (icon, logo) | `importComponentByKeyAsync` |

Check `registries/components.json` — entries with `variantCount > 1` are component sets.

---

## Rule 12: textAutoResize in auto-layout

Set characters FIRST, append, FILL, then textAutoResize:

```js
var t = figma.createText();
t.characters = "Long text...";
parent.appendChild(t);
t.layoutSizingHorizontal = "FILL";
t.textAutoResize = "HEIGHT";
```

**GOTCHA:** `textAutoResize = "HEIGHT"` before the node has width → 0-width vertical text.

---

## Rule 13: strokeAlign INSIDE for cards

```js
card.strokes = mf(borderVar);
card.strokeWeight = 1;
card.strokeAlign = "INSIDE";
```

Always use `"INSIDE"` for cards, panels, inputs.

---

## Rule 14: Cannot add children to instances

Component instances are sealed. Use `setProperties()` or `swapComponent()`.

```js
// WRONG
inst.appendChild(extraFrame); // crashes

// CORRECT
inst.setProperties({ [titleKey]: "New title" });
```

---

## Rule 15: Variant grid layout after combineAsVariants

Variants stack at (0,0) after `combineAsVariants()`. Arrange in a grid:

```js
var cols = 4;
for (var i = 0; i < compSet.children.length; i++) {
  var child = compSet.children[i];
  child.x = (i % cols) * (child.width + 40);
  child.y = Math.floor(i / cols) * (child.height + 40);
}
```

---

## Rule 16: loadFontAsync before ANY text operation

Every script that creates or modifies text MUST load fonts first:

```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
```

Load the fonts used in YOUR design system. Check `registries/text-styles.json` for font families.

---

## Rule 17: Script structure

Every script executed via `figma_execute` MUST follow this structure:

```js
return (async function() {
  // 1. Load fonts
  // 2. Import variables + styles + components (keys from registries)
  // 3. Define helpers (mf, appendFill, bindPadding, bindRadius)
  // 4. Build layout tree (create → configure → append → FILL)
  // 5. Return summary
  return { success: true };
})();
```

The `return` before the IIFE is mandatory — without it, the Promise is lost.

---

## Rule 18: DS component reuse — NEVER recreate existing components

**This is the most critical rule. Violations require FULL script rewrite.**

Before creating ANY visual element, check the registries:
1. `registries/components.json` → Buttons, Tags, Inputs, Avatars, Dividers, Cards, etc.
2. `registries/icons.json` → Icons (if exists)
3. `registries/logos.json` → Logos, brand assets (if exists)
4. `registries/illustrations.json` → Illustrations (if exists)

**NEVER:**
- `figma.createEllipse()` for a logo → import from logos.json via `importComponentByKeyAsync`
- `figma.createFrame()` for a Tag/Badge → import from components.json via `importComponentSetByKeyAsync`
- `figma.createFrame()` for a Card → import the DS Card component
- `figma.createRectangle()` for a Divider → import the DS Divider component
- Hardcode hex colors → always bind variables

**Why this matters:** Using raw elements cascades into multiple failures:
- No `INSTANCE_SWAP` props possible (can't swap a logo on an ellipse)
- No inherited component properties (size, variant, state)
- Wrong proportions (raw frames don't match DS component sizing)
- Breaks the design system contract — the whole point of Bridge

**Pre-script audit (MANDATORY — must appear before every script):**
```
PRE-SCRIPT AUDIT — Step {n}:
Spec requires:           Registry match:              Script will use:
─────────────────────────────────────────────────────────────────────
{element}              → {registry}.json key: {key}   → import{method} ✓
{element}              → NO DS component              → raw {type} (reason) ✓
```

**If ANY spec-listed DS component is planned as a raw element → STOP and fix before writing the script.**

---

## Rule 19: Canvas positioning — never stack components

- **NEVER** leave multiple components at (0, 0)
- **Minimum gap**: 80px between components on the canvas
- **Sub-components**: horizontal row at the top
- **Main component**: 400px below sub-components

```js
var currentX = 0;
for (var i = 0; i < subComponents.length; i++) {
  subComponents[i].x = currentX;
  subComponents[i].y = 0;
  currentX += subComponents[i].width + 80;
}
mainComponent.x = 0;
mainComponent.y = 400;
```

---

## Rule 20: Component key vs Node ID (CRITICAL)

Figma components have TWO different identifiers:

| | Node ID (`id`) | Component Key (`key`) |
|---|---|---|
| **Format** | `"1008:174"` (colon-separated numbers) | `"abc123def456..."` (hex hash) |
| **Used for** | `figma.getNodeByIdAsync()` | `importComponentByKeyAsync()` |
| **Available from** | Any node | Only published components/variables/styles |

**These are NOT interchangeable.** Import APIs (`importComponentByKeyAsync`, `importComponentSetByKeyAsync`, `importVariableByKeyAsync`, `importStyleByKeyAsync`) all require the `key`, NOT the `id`.

Similarly, variables have:
- `name`: `"color/background/neutral/boldest"` — human-readable path
- `key`: `"VariableID:55:114"` or hex hash — for `importVariableByKeyAsync`

**Always verify registries contain `key` fields before writing import scripts. If a registry only has `id` or `name` values, re-run extraction to capture keys.**

---

## Rule 21: setTextStyleIdAsync (not textStyleId) in dynamic-page context

When running scripts via `figma_execute` (which uses `documentAccess: "dynamic-page"`), text style assignment MUST use the async API:

```js
// WRONG — crashes in dynamic-page context
text.textStyleId = style.id;

// CORRECT
await text.setTextStyleIdAsync(style.id);
```

Same applies to `setFillStyleIdAsync`, `setStrokeStyleIdAsync`, `setEffectStyleIdAsync`.

---

## Rule 22: Clone-first for screens with reference

When a reference Figma node is available (from the spec's "Reference Screen" section), **clone the shell structure instead of rebuilding from scratch**.

### When to clone

Clone when the element is:
- A **layout shell** (sidebar + content + footer structure)
- A **complex pre-configured instance** (stepper with labels, navigation with active states)
- A **local/unpublished component** (backgrounds, decorative elements not in the DS library)
- An instance with **deeply nested properties** (3+ levels, properties on nested children not exposed at root)

### How to clone

```js
// Clone an entire subtree from a reference node
var ref = await figma.getNodeByIdAsync("REFERENCE_NODE_ID");
var clone = ref.clone();

// Position the clone
clone.x = 0;
clone.y = 0;

// Now modify the clone's content (replace text, swap instances, etc.)
var title = clone.findOne(function(n) { return n.name === "title" && n.type === "TEXT"; });
if (title) title.characters = "New Title";
```

### Clone vs Import decision

| Situation | Strategy |
|-----------|----------|
| Component in DS library, simple props | **Import** via `importComponentByKeyAsync` |
| Component in DS library, deeply nested | **Clone** from reference if available |
| Local/unpublished component | **Clone** from reference (only option) |
| Layout shell (sidebar + content + footer) | **Clone** the whole shell, replace content |
| Pre-configured stepper/nav with labels set | **Clone** (API can't easily override nested props) |

### Pre-script audit format for clone elements

```
PRE-SCRIPT AUDIT — Step {n}:
Spec requires:           Source:                      Strategy:
─────────────────────────────────────────────────────────────────
Sidebar shell          → reference node 9569:40232    → clone ✓
ProductBackground      → reference node 9569:40233    → clone ✓
SideStepper (5 steps)  → reference node 9569:40240    → clone + modify labels ✓
Button (primary)       → components.json key: abc123  → import ✓
Input (default)        → components.json key: def456  → import ✓
```

---

## Standard Script Boilerplate

```js
return (async function() {

  // ─── FONTS ───
  // Load fonts used by your DS (check registries/text-styles.json for families)
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // ─── VARIABLES (from registries/variables.json) ───
  // Load spacing, radius, and color variables by key
  // var spLarge = await figma.variables.importVariableByKeyAsync("YOUR_KEY");
  // var radMedium = await figma.variables.importVariableByKeyAsync("YOUR_KEY");
  // var bgColor = await figma.variables.importVariableByKeyAsync("YOUR_KEY");

  // ─── HELPERS ───
  function mf(colorVar) {
    var p = figma.util.solidPaint("#000000");
    p = figma.variables.setBoundVariableForPaint(p, "color", colorVar);
    return [p];
  }

  function appendFill(parent, child, fillH, fillV) {
    parent.appendChild(child);
    if (fillH) child.layoutSizingHorizontal = "FILL";
    if (fillV) child.layoutSizingVertical = "FILL";
  }

  function bindPadding(frame, top, right, bottom, left) {
    if (top) frame.setBoundVariable("paddingTop", top);
    if (right) frame.setBoundVariable("paddingRight", right);
    if (bottom) frame.setBoundVariable("paddingBottom", bottom);
    if (left) frame.setBoundVariable("paddingLeft", left);
  }

  function bindRadius(frame, radiusVar) {
    frame.setBoundVariable("topLeftRadius", radiusVar);
    frame.setBoundVariable("topRightRadius", radiusVar);
    frame.setBoundVariable("bottomLeftRadius", radiusVar);
    frame.setBoundVariable("bottomRightRadius", radiusVar);
  }

  // ─── BUILD ───
  // ... your design code here ...

  return { success: true };
})();
```
