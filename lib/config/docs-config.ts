import YAML from "js-yaml";
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
  const parsed = YAML.load(raw);
  return DocsConfigSchema.parse(parsed);
}
