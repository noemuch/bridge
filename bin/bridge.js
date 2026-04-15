#!/usr/bin/env node
// bridge-ds single-bin router — forwards v4.0.0 docs commands to the
// TS-compiled CLI under dist/, and keeps the legacy CLI (init/update/…)
// intact under lib/cli.js for backwards compatibility.

const cmd = process.argv[2];
const v4Cmds = new Set(["init-docs", "doctor", "docs", "extract", "cron"]);

if (v4Cmds.has(cmd)) {
  const { main } = require("../dist/lib/cli/main.js");
  main();
} else {
  const { run } = require('../lib/cli');
  run(process.argv.slice(2));
}
