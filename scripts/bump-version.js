#!/usr/bin/env node
/* eslint-disable */
// Syncs the `version` field across every manifest so bumping from v5.0.0 to
// v5.0.1 is a single command. Usage: `node scripts/bump-version.js [<version>]`.
// If no version is given, reads the one already in package.json and propagates it.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const MANIFESTS = [
  "package.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/plugin.json",
];

const target = process.argv[2];

const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = target ?? pkg.version;

if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) {
  console.error(`Invalid version: ${version}`);
  process.exit(1);
}

function patchManifest(relPath, nextVersion) {
  const p = path.join(ROOT, relPath);
  if (!fs.existsSync(p)) {
    console.warn(`skip (missing): ${relPath}`);
    return;
  }
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw);
  // marketplace.json nests the plugin entry under `plugins[0].version`.
  if (Array.isArray(parsed.plugins)) {
    for (const plugin of parsed.plugins) {
      if (typeof plugin === "object" && plugin && "version" in plugin) {
        plugin.version = nextVersion;
      }
    }
  }
  if (typeof parsed.version === "string") parsed.version = nextVersion;
  fs.writeFileSync(p, JSON.stringify(parsed, null, 2) + "\n");
  console.log(`set ${relPath} → ${nextVersion}`);
}

// VERSION constant inside lib/cli/main.ts (string literal after `export const VERSION`).
function patchCliVersion(nextVersion) {
  const p = path.join(ROOT, "lib/cli/main.ts");
  const src = fs.readFileSync(p, "utf8");
  const next = src.replace(
    /export const VERSION = ".*?";/,
    `export const VERSION = "${nextVersion}";`
  );
  if (next !== src) {
    fs.writeFileSync(p, next);
    console.log(`set lib/cli/main.ts VERSION → ${nextVersion}`);
  }
}

for (const m of MANIFESTS) patchManifest(m, version);
patchCliVersion(version);

console.log(`Done. Run \`npm run build\` and commit.`);
