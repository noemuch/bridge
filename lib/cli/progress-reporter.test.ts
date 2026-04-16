import { test } from "node:test";
import assert from "node:assert/strict";
import { ProgressReporter } from "./progress-reporter.js";

test("ProgressReporter emits [progress] JSON lines on stdout", () => {
  const lines: string[] = [];
  const reporter = new ProgressReporter({
    emit: (line) => lines.push(line),
  });

  reporter.report({ event: "components", count: 12, total: 156 });
  reporter.report({ event: "variables", count: 45, total: 856 });

  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("[progress]"));
  const parsed = JSON.parse(lines[0].slice("[progress] ".length));
  assert.equal(parsed.event, "components");
  assert.equal(parsed.count, 12);
  assert.equal(parsed.total, 156);
});

test("ProgressReporter handles 0/N and N/N edges", () => {
  const lines: string[] = [];
  const reporter = new ProgressReporter({ emit: (line) => lines.push(line) });

  reporter.report({ event: "components", count: 0, total: 156 });
  reporter.report({ event: "components", count: 156, total: 156 });

  assert.equal(lines.length, 2);
  assert.match(lines[0], /"count":0/);
  assert.match(lines[1], /"count":156/);
});

test("ProgressReporter includes timestamp", () => {
  const lines: string[] = [];
  const reporter = new ProgressReporter({ emit: (line) => lines.push(line) });
  reporter.report({ event: "components", count: 5, total: 10 });
  const parsed = JSON.parse(lines[0].slice("[progress] ".length));
  assert.ok(typeof parsed.ts === "string", "ts field must be present");
  assert.match(parsed.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});
