// lib/docs/generators/migration.ts
import { renderTemplate } from "../templates/renderer.js";

export interface MigrationInput {
  reason: string;
  "reason-body": string;
  date: string;
  from: string;
  to: string;
  severity: "breaking" | "deprecation" | "non-breaking";
  deprecatedAt: string;
  removalAt?: string;
  fromKbVersion: string;
  toKbVersion: string;
  affected: Array<{ name: string; path: string }>;
  steps: string[];
}

export async function generateMigrationDoc(input: MigrationInput): Promise<string> {
  return renderTemplate("migration.md.hbs", input as unknown as Record<string, unknown>);
}
