const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if Figma MCP servers are configured in Claude Code settings.
 * Returns { console: boolean, official: boolean }
 *   - console:  figma-console-mcp is configured
 *   - official: Official Figma MCP (mcp.figma.com or "figma"/"claude.ai Figma" without figma-console-mcp)
 */
function checkMcp() {
  const result = { console: false, official: false };

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
        const args = (config.args || []).join(' ');
        const url = config.url || '';

        // figma-console-mcp detection
        if (name.includes('figma') && config.command && args.includes('figma-console-mcp')) {
          result.console = true;
          continue;
        }

        // Official Figma MCP detection
        if (url.includes('mcp.figma.com')) {
          result.official = true;
          continue;
        }
        if ((name === 'figma' || name === 'claude.ai Figma') && !args.includes('figma-console-mcp')) {
          result.official = true;
          continue;
        }
      }
    } catch (_) {}
  }

  return result;
}

module.exports = { checkMcp };
