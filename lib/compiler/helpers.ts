// ---------------------------------------------------------------------------
// helpers.ts — runtime helper block + font loader code generation
// ---------------------------------------------------------------------------

export const HELPER_BLOCK: string = [
  "// ─── HELPERS ───",
  "function mf(colorVar) {",
  '  var p = figma.util.solidPaint("#000000");',
  '  p = figma.variables.setBoundVariableForPaint(p, "color", colorVar);',
  "  return [p];",
  "}",
  "",
  "function appendFill(parent, child, fillH, fillV) {",
  "  parent.appendChild(child);",
  '  if (fillH) child.layoutSizingHorizontal = "FILL";',
  '  if (fillV) child.layoutSizingVertical = "FILL";',
  "}",
  "",
  "function bindPadding(frame, top, right, bottom, left) {",
  '  if (top) frame.setBoundVariable("paddingTop", top);',
  '  if (right) frame.setBoundVariable("paddingRight", right);',
  '  if (bottom) frame.setBoundVariable("paddingBottom", bottom);',
  '  if (left) frame.setBoundVariable("paddingLeft", left);',
  "}",
  "",
  "function bindRadius(frame, radiusVar) {",
  '  frame.setBoundVariable("topLeftRadius", radiusVar);',
  '  frame.setBoundVariable("topRightRadius", radiusVar);',
  '  frame.setBoundVariable("bottomLeftRadius", radiusVar);',
  '  frame.setBoundVariable("bottomRightRadius", radiusVar);',
  "}",
  "",
  "function findPropKey(compSet, prefix, type) {",
  "  var defs = compSet.componentPropertyDefinitions;",
  "  return Object.keys(defs).find(function(k) {",
  "    return k.startsWith(prefix) && defs[k].type === type;",
  "  });",
  "}",
].join("\n");

export interface FontRef {
  family: string;
  style: string;
}

/**
 * Returns a JavaScript code string that loads the given fonts via
 * figma.loadFontAsync.
 */
export function fontLoader(fonts: readonly FontRef[] | null | undefined): string {
  if (!fonts || !fonts.length) return "";
  const lines = fonts.map(
    (f) =>
      "await figma.loadFontAsync({ family: " +
      JSON.stringify(f.family) +
      ", style: " +
      JSON.stringify(f.style) +
      " });"
  );
  return lines.join("\n");
}
