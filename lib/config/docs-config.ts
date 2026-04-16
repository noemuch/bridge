import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";
import { z } from "zod";

const CronCfg = z.object({
  cadence: z.string().default("daily"),
  time: z.string().default("06:00"),
  maxPRsPerWeek: z.number().int().positive().default(7),
  autoMergeIfTrivial: z.boolean().default(false),
});

const McpCfg = z.object({
  enabled: z.boolean().default(true),
});

export const DocsConfigSchema = z.object({
  dsName: z.string().min(1),
  tagline: z.string().optional(),
  figmaFileKey: z.string().min(1),
  docsPath: z.string().default("design-system"),
  kbPath: z.string().default("bridge-ds"),
  cron: CronCfg.default({}),
  categories: z.record(z.string(), z.string()).default({}),
  mcp: McpCfg.default({}),
});

export type DocsConfig = z.infer<typeof DocsConfigSchema>;

export function parseDocsConfig(raw: string): DocsConfig {
  // JSON_SCHEMA rejects custom YAML tags (e.g. `!!js/function`) that could
  // execute code at parse time. The config is plain data, so this is safe
  // and strictly tighter than the library default.
  const parsed = yamlLoad(raw, { schema: JSON_SCHEMA });
  return DocsConfigSchema.parse(parsed);
}
