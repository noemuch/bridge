// lib/docs/generators/migration.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateMigrationDoc } from "./migration.js";

test("migration renders from/to + rg command", async () => {
  const md = await generateMigrationDoc({
    reason: "token-rename",
    "reason-body": "Brand refactor.",
    date: "2026-04-15T00:00:00Z",
    from: "$color/bg/primary",
    to: "$color/background/brand/primary",
    severity: "breaking",
    deprecatedAt: "2026-04-15T00:00:00Z",
    removalAt: "2026-07-15T00:00:00Z",
    fromKbVersion: "3.1.0",
    toKbVersion: "3.2.0",
    affected: [{ name: "Button", path: "../components/actions/Button.md" }],
    steps: ["Find all refs.", "Replace.", "Typecheck."],
  });
  assert.match(md, /# Migration: `\$color\/bg\/primary` → `\$color\/background\/brand\/primary`/);
  assert.match(md, /rg --type tsx --type jsx '\$color\/bg\/primary'/);
});
