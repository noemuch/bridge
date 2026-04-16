import { test } from "node:test";
import assert from "node:assert/strict";
import { generateComponentLlmTxt } from "./llm-txt.js";

const ENTRY = {
  name: "Button",
  category: "actions" as const,
  status: "stable",
  key: "k1",
  uses: { tokens: [], components: [] },
  usedBy: [],
  alternatives: ["Link"],
  composesWith: ["Icon"],
  supersedes: [],
  deprecatedBy: null,
};

test("generateComponentLlmTxt renders minimal .llm.txt with all sections", async () => {
  const txt = await generateComponentLlmTxt({
    entry: ENTRY,
    docs: {
      summary: "Triggers an action.",
      whenToUse: ["Primary action", "Form submit"],
      dont: [{ rule: "Use for navigation", source: "learning#1" }],
      props: [{ name: "variant", type: "string", default: "primary" }],
    },
  });

  assert.match(txt, /^# Button \(stable\)$/m);
  assert.match(txt, /Triggers an action\./);
  assert.match(txt, /## Props/);
  assert.match(txt, /variant: string/);
  assert.match(txt, /## When to use/);
  assert.match(txt, /- Primary action/);
  assert.match(txt, /## Don't/);
  assert.match(txt, /## Related/);
  assert.match(txt, /Alternatives: Link/);
  assert.match(txt, /Composes with: Icon/);
});

test("generateComponentLlmTxt stays under 500 words for a typical component", async () => {
  const txt = await generateComponentLlmTxt({
    entry: ENTRY,
    docs: {
      summary: "Triggers an action.",
      whenToUse: ["Primary action", "Form submit", "Destructive confirm"],
      dont: [
        { rule: "Navigation", source: "l1" },
        { rule: "Toggle state", source: "l2" },
      ],
      props: [
        { name: "variant", type: "primary|secondary|ghost|danger", default: "primary" },
        { name: "size", type: "sm|md|lg", default: "md" },
        { name: "icon", type: "IconName" },
      ],
    },
  });
  const wordCount = txt.split(/\s+/).filter(Boolean).length;
  assert.ok(wordCount < 500, `expected <500 words, got ${wordCount}`);
});

test("generateComponentLlmTxt handles empty docs gracefully", async () => {
  const txt = await generateComponentLlmTxt({ entry: ENTRY, docs: {} });
  assert.match(txt, /^# Button \(stable\)$/m);
  assert.match(txt, /\(to be filled via ship-time interview\)/);
  assert.match(txt, /\(none yet\)/);
});
