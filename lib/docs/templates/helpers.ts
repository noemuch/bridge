import Handlebars from "handlebars";

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
  Handlebars.registerHelper("resolveToken", (name: unknown, mode: unknown, ctx: any) => {
    const tokens: Record<string, any> = (ctx && ctx.data?.root?.tokenIndex) || {};
    const t = tokens["$" + String(name)] || tokens[String(name)];
    if (!t || !t.valuesByMode) return "";
    const v = t.valuesByMode[String(mode)];
    if (!v) return "";
    if (typeof v === "object" && "r" in v) {
      const { r, g, b } = v as any;
      return "#" + [r, g, b].map((n: number) => Math.round(n * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    return String(v);
  });
  Handlebars.registerHelper("provenanceMarker", (source: unknown) => new Handlebars.SafeString(`<!-- source: ${source} -->`));
  Handlebars.registerHelper("manualRegion", (id: unknown) => new Handlebars.SafeString(`<!-- manual:${id} -->\n<!-- /manual:${id} -->`));
  Handlebars.registerHelper("concat", (...args: unknown[]) => args.slice(0, -1).join(""));
  Handlebars.registerHelper("lookup", (obj: any, key: string) => obj?.[key]);
  (globalThis as any).__bridgeHandlebars = Handlebars;
}
