const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if figma-console-mcp is configured in Claude Code settings.
 */
function checkMcp() {
  const locations = [
    path.join(os.homedir(), '.claude.json'),
    path.join(os.homedir(), '.claude', 'settings.json'),
    path.join(process.cwd(), '.claude', 'settings.local.json'),
  ];

  for (const loc of locations) {
    if (!fs.existsSync(loc)) continue;
    try {
      const content = JSON.parse(fs.readFileSync(loc, 'utf8'));
      const servers = content.mcpServers || {};
      for (const [name, config] of Object.entries(servers)) {
        if (name.includes('figma') && config.command) {
          const args = (config.args || []).join(' ');
          if (args.includes('figma-console-mcp')) return true;
        }
      }
    } catch (_) {}
  }

  return false;
}

module.exports = { checkMcp };
