// lib/docs/preservation.ts
const REGION_RE = /<!-- manual:([^ ]+?) -->([\s\S]*?)<!-- \/manual:\1 -->/g;

export function extractRegions(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  const re = new RegExp(REGION_RE.source, "g");
  while ((m = re.exec(src)) !== null) {
    out[m[1]] = m[2].replace(/^\n|\n$/g, "");
  }
  return out;
}

export function mergeRegions(freshRender: string, savedRegions: Record<string, string>): string {
  const presentInFresh = new Set<string>();
  const merged = freshRender.replace(REGION_RE, (full, id: string) => {
    presentInFresh.add(id);
    const saved = savedRegions[id];
    if (saved == null) return full;
    return `<!-- manual:${id} -->\n${saved}\n<!-- /manual:${id} -->`;
  });
  const orphans = Object.entries(savedRegions).filter(([id]) => !presentInFresh.has(id));
  if (orphans.length === 0) return merged;
  const tail = orphans.map(([id, body]) =>
    `\n<!-- WARNING: orphaned manual region "${id}" — moved from its original position -->\n${body}\n`
  ).join("\n");
  return merged + "\n\n---\n<!-- Orphaned manual regions appended by preservation engine -->\n" + tail;
}
