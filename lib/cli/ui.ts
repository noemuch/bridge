import pc from "picocolors";

const BRAND_R = 244,
  BRAND_G = 91,
  BRAND_B = 38;
const rgb = (r: number, g: number, b: number) => (s: string) =>
  `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`;

export const brand = rgb(BRAND_R, BRAND_G, BRAND_B);
export const brandBg = (s: string) =>
  `\x1b[48;2;${BRAND_R};${BRAND_G};${BRAND_B}m\x1b[97m${s}\x1b[0m`;
export const dim = pc.dim;
export const success = pc.green;
export const error = pc.red;
export const warn = pc.yellow;
export const bold = pc.bold;

export const icons = {
  pass: success("✓"),
  fail: error("✗"),
  info: brand("◆"),
  warn: warn("▲"),
};
