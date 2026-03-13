# Bridge DS — Claude Code Instructions

Bridge DS is an AI-powered design workflow that generates Figma designs using your real design system. It uses [figma-console-mcp](https://github.com/southleft/figma-console-mcp) as the transport layer.

## Architecture

```
Claude Code  ──MCP──>  figma-console-mcp  ──WebSocket──>  Figma Desktop
```

All Figma operations use MCP tools — no custom server, no HTTP calls, no curl.

## Key MCP Tools

| Tool | Usage |
|------|-------|
| `figma_execute` | Run Figma Plugin API code (create frames, import components, bind variables) |
| `figma_take_screenshot` | Visual verification between atomic generation steps |
| `figma_get_design_system_kit` | Extract full DS (tokens + components + styles) |
| `figma_get_variables` | Extract design tokens/variables |
| `figma_get_component` | Get component specs and properties |
| `figma_get_styles` | Get text, color, effect styles |
| `figma_search_components` | Find components by name |
| `figma_get_status` | Check Figma connection |

## Script Structure (for figma_execute)

Every script must follow this pattern:

```javascript
return (async function() {
  // 1. Load fonts (required before ANY text operation)
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  // 2. Import DS assets (keys from knowledge-base/registries/)
  // var myVar = await figma.variables.importVariableByKeyAsync("key");
  // var myStyle = await figma.importStyleByKeyAsync("key");
  // var myComp = await figma.importComponentByKeyAsync("key");

  // 3. Build
  // ...

  // 4. Return summary
  return { success: true };
})();
```

The `return` before the IIFE is mandatory — without it the Promise is lost.

## Critical Figma API Rules

Full rules: `.claude/skills/design-workflow/references/figma-api-rules.md`

**Top 5 (most common bugs):**

1. **FILL after appendChild** — Set `layoutSizingHorizontal = "FILL"` AFTER `parent.appendChild(child)`, never before
2. **resize() overrides sizing** — Call `resize()` FIRST, then set `primaryAxisSizingMode`
3. **Colors via setBoundVariableForPaint** — Not `setBoundVariable` (different API for fills/strokes)
4. **textAutoResize after width** — Set characters → append → FILL → then `textAutoResize = "HEIGHT"`
5. **DS component reuse** — NEVER recreate existing components as raw frames. Always import via `importComponentByKeyAsync`

## Helpers

```javascript
// Color fill bound to variable
function mf(colorVar) {
  var p = figma.util.solidPaint("#000000");
  p = figma.variables.setBoundVariableForPaint(p, "color", colorVar);
  return [p];
}

// Append + FILL in one call
function appendFill(parent, child, fillH, fillV) {
  parent.appendChild(child);
  if (fillH) child.layoutSizingHorizontal = "FILL";
  if (fillV) child.layoutSizingVertical = "FILL";
}

// Bind all 4 padding sides
function bindPadding(frame, top, right, bottom, left) {
  if (top) frame.setBoundVariable("paddingTop", top);
  if (right) frame.setBoundVariable("paddingRight", right);
  if (bottom) frame.setBoundVariable("paddingBottom", bottom);
  if (left) frame.setBoundVariable("paddingLeft", left);
}

// Bind all 4 corners radius
function bindRadius(frame, radiusVar) {
  frame.setBoundVariable("topLeftRadius", radiusVar);
  frame.setBoundVariable("topRightRadius", radiusVar);
  frame.setBoundVariable("bottomLeftRadius", radiusVar);
  frame.setBoundVariable("bottomRightRadius", radiusVar);
}
```

## Design Workflow

The `/design-workflow` skill handles everything:

```
/design-workflow setup    → Extract DS + build knowledge base
/design-workflow spec     → Write component or screen specification
/design-workflow design   → Generate in Figma (atomic, verified)
/design-workflow review   → Validate against spec + tokens
/design-workflow done     → Archive and ship
```

Read `.claude/skills/design-workflow/SKILL.md` for the full workflow definition.
