const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if figma-console-mcp is configured in Claude Code settings.
 * Checks multiple possible locations.
 */
function checkMcp() {
  const locations = [
    // User-level Claude Code settings
    path.join(os.homedir(), '.claude.json'),
    // Project-level settings
    path.join(process.cwd(), '.claude', 'settings.local.json'),
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const content = JSON.parse(fs.readFileSync(loc, 'utf8'));
        const servers = content.mcpServers || {};
        // Check for any figma-console-mcp configuration
        for (const [name, config] of Object.entries(servers)) {
          if (name.includes('figma') && config.command) {
            const args = (config.args || []).join(' ');
            if (args.includes('figma-console-mcp')) {
              return true;
            }
          }
        }
      } catch (_) {
        // Ignore parse errors
      }
    }
  }

  return false;
}

/**
 * Return the MCP add command for the user to run.
 */
function getMcpAddCommand() {
  return 'claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN -- npx -y figma-console-mcp@latest';
}

module.exports = { checkMcp, getMcpAddCommand };
