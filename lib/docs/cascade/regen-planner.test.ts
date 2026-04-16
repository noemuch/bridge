// lib/docs/cascade/regen-planner.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planRegens } from "./regen-planner.js";

const idx: any = {
  componentIndex: {
    Button: { category: "actions" },
    Card: { category: "surface" },
  },
};

test("planRegens orders: foundations → components → patterns → changelogs → migrations", () => {
  const writes = planRegens(
    {
      componentsToRegen: ["Button"],
      foundationsToRegen: ["color"],
      patternsToRegen: ["form-submit"],
      changelogsToAppend: ["Button"],
      migrations: [
        { reason: "component-rename", from: "OldBtn", to: "Button", severity: "breaking" },
      ],
    },
    idx,
    "design-system"
  );

  const kinds = writes.map((w) => w.kind);
  assert.deepEqual(kinds, ["foundation", "component", "pattern", "changelog", "migration"]);
});

test("planRegens resolves component category from index", () => {
  const writes = planRegens(
    {
      componentsToRegen: ["Button", "Card"],
      foundationsToRegen: [],
      patternsToRegen: [],
      changelogsToAppend: [],
      migrations: [],
    },
    idx,
    "ds"
  );
  assert.ok(writes.find((w) => w.path === "ds/components/actions/Button.md"));
  assert.ok(writes.find((w) => w.path === "ds/components/surface/Card.md"));
});

test("planRegens slugifies migration filenames", () => {
  const writes = planRegens(
    {
      componentsToRegen: [],
      foundationsToRegen: [],
      patternsToRegen: [],
      changelogsToAppend: [],
      migrations: [
        {
          reason: "token-rename",
          from: "$color/bg/primary",
          to: "$color/brand/primary",
          severity: "breaking",
        },
      ],
    },
    idx,
    "ds"
  );
  assert.ok(writes[0].path.includes("token-rename--color-bg-primary"));
});
