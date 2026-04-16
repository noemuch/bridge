import Handlebars from "handlebars";

interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface TokenEntry {
  valuesByMode?: Record<string, RgbColor | string | number | boolean | null>;
}

interface HandlebarsCtxData {
  data?: {
    root?: {
      tokenIndex?: Record<string, TokenEntry>;
    };
  };
}

const isHandlebarsCtx = (v: unknown): v is HandlebarsCtxData =>
  typeof v === "object" && v !== null && "data" in v;

const isRgb = (v: unknown): v is RgbColor =>
  typeof v === "object" && v !== null && "r" in v && "g" in v && "b" in v;

export function registerAllHelpers(): void {
  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper("not", (v: unknown) => !v);
  Handlebars.registerHelper("join", (arr: unknown, sep: unknown = ", ") => {
    if (!Array.isArray(arr)) return "";
    return arr.join(String(sep));
  });
  Handlebars.registerHelper("upper", (s: unknown) => String(s).toUpperCase());
  Handlebars.registerHelper("lower", (s: unknown) => String(s).toLowerCase());
  Handlebars.registerHelper("formatDate", (iso: unknown) => {
    if (!iso || typeof iso !== "string") return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  });
  Handlebars.registerHelper("resolveToken", (name: unknown, mode: unknown, ctx: unknown) => {
    const tokens: Record<string, TokenEntry> = isHandlebarsCtx(ctx)
      ? (ctx.data?.root?.tokenIndex ?? {})
      : {};
    const key = String(name);
    const entry = tokens["$" + key] ?? tokens[key];
    if (!entry?.valuesByMode) return "";
    const v = entry.valuesByMode[String(mode)];
    if (v == null) return "";
    if (isRgb(v)) {
      return (
        "#" +
        [v.r, v.g, v.b]
          .map((n) =>
            Math.round(n * 255)
              .toString(16)
              .padStart(2, "0")
          )
          .join("")
          .toUpperCase()
      );
    }
    return String(v);
  });
  // provenanceMarker: `source` is constrained to a safe alphabet at render time —
  // the SafeString wrapper emits raw HTML comments so rogue "-->" input would
  // break downstream markdown rendering.
  Handlebars.registerHelper("provenanceMarker", (source: unknown) => {
    const safe = String(source ?? "").replace(/[^A-Za-z0-9._:/-]/g, "_");
    return new Handlebars.SafeString(`<!-- source: ${safe} -->`);
  });
  Handlebars.registerHelper("manualRegion", (id: unknown) => {
    const safe = String(id ?? "").replace(/[^A-Za-z0-9._-]/g, "_");
    return new Handlebars.SafeString(`<!-- manual:${safe} -->\n<!-- /manual:${safe} -->`);
  });
  Handlebars.registerHelper("concat", (...args: unknown[]) => args.slice(0, -1).join(""));
  Handlebars.registerHelper("lookup", (obj: unknown, key: unknown) => {
    if (obj == null || typeof obj !== "object") return undefined;
    return (obj as Record<string, unknown>)[String(key)];
  });
}
