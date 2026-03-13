const fs = require('fs');
const path = require('path');

/**
 * Recursively copy a directory, preserving structure.
 * @param {string[]} skipDirs - directory names to skip (e.g., ['registries', 'guides', 'ui-references'])
 */
function copyDir(src, dest, skipDirs = []) {
  const created = [];
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.includes(entry.name)) continue;
      created.push(...copyDir(srcPath, destPath, skipDirs));
    } else {
      fs.copyFileSync(srcPath, destPath);
      created.push(destPath);
    }
  }
  return created;
}

/**
 * Scaffold Bridge DS into the target project directory.
 * Returns { created: string[] } with relative paths of created files.
 */
function scaffold(projectDir) {
  const created = [];
  const pkgRoot = path.resolve(__dirname, '..');

  // 1. Copy skills/design-workflow → .claude/skills/design-workflow
  const skillsSrc = path.join(pkgRoot, 'skills', 'design-workflow');
  const skillsDest = path.join(projectDir, '.claude', 'skills', 'design-workflow');
  if (fs.existsSync(skillsSrc)) {
    const files = copyDir(skillsSrc, skillsDest);
    created.push(...files.map(f => path.relative(projectDir, f)));
  }

  // 2. Copy commands/design-workflow.md → .claude/commands/design-workflow.md
  const cmdSrc = path.join(pkgRoot, 'commands', 'design-workflow.md');
  const cmdDest = path.join(projectDir, '.claude', 'commands', 'design-workflow.md');
  if (fs.existsSync(cmdSrc)) {
    fs.mkdirSync(path.dirname(cmdDest), { recursive: true });
    fs.copyFileSync(cmdSrc, cmdDest);
    created.push(path.relative(projectDir, cmdDest));
  }

  // 3. Create specs/ directory structure
  const specsDirs = [
    'specs/active',
    'specs/backlog',
    'specs/shipped',
    'specs/dropped',
  ];
  for (const dir of specsDirs) {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      // Add .gitkeep
      const gitkeep = path.join(fullPath, '.gitkeep');
      fs.writeFileSync(gitkeep, '');
      created.push(path.relative(projectDir, gitkeep));
    }
  }

  // Create history.log if not exists
  const historyLog = path.join(projectDir, 'specs', 'history.log');
  if (!fs.existsSync(historyLog)) {
    fs.writeFileSync(historyLog, '# Design History\n# date | name | type | figma_url | author\n');
    created.push(path.relative(projectDir, historyLog));
  }

  // 4. Create empty knowledge-base directories
  const kbDirs = [
    '.claude/skills/design-workflow/references/knowledge-base/registries',
    '.claude/skills/design-workflow/references/knowledge-base/guides/tokens',
    '.claude/skills/design-workflow/references/knowledge-base/guides/components',
    '.claude/skills/design-workflow/references/knowledge-base/guides/patterns',
    '.claude/skills/design-workflow/references/knowledge-base/guides/assets',
    '.claude/skills/design-workflow/references/knowledge-base/ui-references/screenshots',
  ];
  for (const dir of kbDirs) {
    const fullPath = path.join(projectDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      const gitkeep = path.join(fullPath, '.gitkeep');
      if (!fs.existsSync(gitkeep)) {
        fs.writeFileSync(gitkeep, '');
      }
    }
  }

  // 5. Update .gitignore
  const gitignorePath = path.join(projectDir, '.gitignore');
  const gitignoreEntries = [
    '',
    '# Bridge DS — knowledge base data (regenerated via /design-workflow setup)',
    '.claude/skills/design-workflow/references/knowledge-base/registries/*.json',
    '.claude/skills/design-workflow/references/knowledge-base/ui-references/screenshots/*.png',
    '.claude/skills/design-workflow/references/knowledge-base/ui-references/screenshots/*.jpg',
  ];
  const gitignoreBlock = gitignoreEntries.join('\n') + '\n';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('Bridge DS')) {
      fs.appendFileSync(gitignorePath, gitignoreBlock);
      created.push('.gitignore (updated)');
    }
  } else {
    fs.writeFileSync(gitignorePath, 'node_modules/\n.DS_Store\n' + gitignoreBlock);
    created.push('.gitignore');
  }

  return { created };
}

/**
 * Update only the skill files (SKILL.md, actions, rules, schemas, templates).
 * Preserves all user-generated data (registries, guides, ui-references, specs).
 * Returns { updated: string[] } with relative paths of updated files.
 */
function update(projectDir) {
  const updated = [];
  const pkgRoot = path.resolve(__dirname, '..');

  const skillsSrc = path.join(pkgRoot, 'skills', 'design-workflow');
  const skillsDest = path.join(projectDir, '.claude', 'skills', 'design-workflow');

  if (!fs.existsSync(skillsDest)) {
    return { updated: [], error: 'Bridge DS not initialized. Run: npx @noemuch/bridge-ds init' };
  }

  // Copy skill files, skipping user-generated KB data
  const userDataDirs = ['registries', 'guides', 'ui-references'];
  const files = copyDir(skillsSrc, skillsDest, userDataDirs);
  updated.push(...files.map(f => path.relative(projectDir, f)));

  // Update command file
  const cmdSrc = path.join(pkgRoot, 'commands', 'design-workflow.md');
  const cmdDest = path.join(projectDir, '.claude', 'commands', 'design-workflow.md');
  if (fs.existsSync(cmdSrc)) {
    fs.mkdirSync(path.dirname(cmdDest), { recursive: true });
    fs.copyFileSync(cmdSrc, cmdDest);
    updated.push(path.relative(projectDir, cmdDest));
  }

  return { updated };
}

module.exports = { scaffold, update };
