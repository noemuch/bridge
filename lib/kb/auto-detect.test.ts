import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { detectFigmaFileKey, detectGitRemote } from "./auto-detect.js";

const FIX = path.resolve("test/fixtures/readme");

test("detectFigmaFileKey parses URL from README code block", async () => {
  const result = await detectFigmaFileKey({ readmePath: path.join(FIX, "with-figma-url.md") });
  assert.equal(result, "abc123FILE_KEY_SAMPLE");
});

test("detectFigmaFileKey returns null when README has no URL", async () => {
  const result = await detectFigmaFileKey({ readmePath: path.join(FIX, "without-figma-url.md") });
  assert.equal(result, null);
});

test("detectFigmaFileKey falls back to package.json figma field", async () => {
  const result = await detectFigmaFileKey({
    readmePath: "does-not-exist",
    packageJsonPath: path.join(FIX, "with-package-json-figma.json"),
  });
  assert.equal(result, "xyz789OTHER_KEY");
});

test("detectGitRemote parses origin URL from git config", async () => {
  const mockConfig = `[remote "origin"]
\turl = git@github.com:acme/design-system.git
\tfetch = +refs/heads/*:refs/remotes/origin/*`;
  const result = await detectGitRemote({ gitConfigContent: mockConfig });
  assert.equal(result, "acme/design-system");
});

test("detectGitRemote handles https remote", async () => {
  const mockConfig = `[remote "origin"]
\turl = https://github.com/acme/design-system.git`;
  const result = await detectGitRemote({ gitConfigContent: mockConfig });
  assert.equal(result, "acme/design-system");
});

test("detectGitRemote returns null when no remote found", async () => {
  const result = await detectGitRemote({ gitConfigContent: "[core]\n\trepositoryformatversion = 0\n" });
  assert.equal(result, null);
});
