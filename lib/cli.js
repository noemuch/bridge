const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const { scaffold, update } = require('./scaffold');
const { checkMcp } = require('./mcp-setup');

// ── Formatting ───────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  orange: '\x1b[38;2;237;112;46m',
  green: '\x1b[38;2;76;175;80m',
  red: '\x1b[38;2;244;67;54m',
  yellow: '\x1b[38;2;255;193;7m',
  gray: '\x1b[38;2;158;158;158m',
};

function print(msg = '') { process.stdout.write(msg + '\n'); }
function ok(msg) { print(`  ${C.green}✓${C.reset} ${msg}`); }
function fail(msg) { print(`  ${C.red}✗${C.reset} ${msg}`); }
function warn(msg) { print(`  ${C.yellow}!${C.reset} ${msg}`); }
function dim(msg) { print(`  ${C.dim}${msg}${C.reset}`); }

function brand() {
  const pkg = require('../package.json');
  print(`\n  ${C.orange}${C.bold}Bridge DS${C.reset} ${C.dim}v${pkg.version}${C.reset}\n`);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Commands ─────────────────────────────────────────────

async function cmdInit() {
  brand();

  const cwd = process.cwd();

  // 1. Prerequisites
  const nodeVersion = process.version.replace('v', '').split('.').map(Number);
  if (nodeVersion[0] < 18) {
    fail(`Node.js 18+ required (found ${process.version})`);
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);

  // 2. Figma MCP transport
  const mcp = checkMcp();
  let mcpReady = mcp.console || mcp.official;

  if (mcp.console) {
    ok('figma-console-mcp detected (preferred transport)');
  }
  if (mcp.official) {
    ok('Official Figma MCP detected' + (mcp.console ? ' (fallback)' : ''));
    if (!mcp.console) {
      dim('figma-console-mcp is recommended for full capabilities but official MCP works too');
    }
  }

  if (!mcpReady) {
    warn('No Figma MCP transport configured');
    print('');
    dim('Bridge supports two transports:');
    dim('  A) figma-console-mcp (recommended, full Plugin API access)');
    dim('  B) Official Figma MCP (cloud-based, cross-library search)');
    print('');
    dim('For option A, you need a Personal Access Token from Figma:');
    dim('https://www.figma.com/developers/api#access-tokens');
    print('');

    const token = await ask(`${C.bold}Figma token${C.reset} (figd_...) for figma-console-mcp, or Enter to skip:`);

    if (token && token.startsWith('figd_')) {
      try {
        execSync(
          `claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=${token} -- npx -y figma-console-mcp@latest`,
          { stdio: 'pipe' }
        );
        ok('figma-console-mcp configured');
        mcpReady = true;
      } catch (e) {
        fail('Could not configure MCP automatically');
        dim('Run manually:');
        dim(`claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=${token} -- npx -y figma-console-mcp@latest`);
      }
    } else if (token) {
      warn('Token should start with figd_ — skipping MCP setup');
      dim('You can configure it later:');
      dim('claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=<token> -- npx -y figma-console-mcp@latest');
    } else {
      dim('Skipped. You can configure either transport later.');
      dim('Console: claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=<token> -- npx -y figma-console-mcp@latest');
      dim('Official: Configure via Claude settings or Figma MCP integration.');
    }
  }

  print('');

  // 3. Scaffold
  const result = scaffold(cwd);
  ok(`${result.created.length} files scaffolded`);

  // 4. Summary
  print('');
  if (mcpReady) {
    ok(`${C.bold}Ready!${C.reset} Open Claude Code and run: ${C.orange}/design-workflow setup${C.reset}`);
  } else {
    warn(`${C.bold}Almost ready.${C.reset} Configure figma-console-mcp, then run: ${C.orange}/design-workflow setup${C.reset}`);
  }
  print('');
}

async function cmdUpdate() {
  brand();

  const cwd = process.cwd();
  const result = update(cwd);

  if (result.error) {
    fail(result.error);
    process.exit(1);
  }

  ok(`${result.updated.length} files updated`);
  dim('Knowledge base preserved (registries, guides, screenshots)');
  print('');
}

function cmdHelp() {
  brand();
  print(`  ${C.bold}Commands${C.reset}`);
  print(`    ${C.orange}init${C.reset}       Set up Bridge DS in the current project`);
  print(`    ${C.orange}update${C.reset}     Update skill files (preserves knowledge base)`);
  print(`    ${C.orange}help${C.reset}       Show this help`);
  print(`    ${C.orange}version${C.reset}    Show version`);
  print('');
  print(`  ${C.bold}After init${C.reset}`);
  print(`    ${C.dim}/design-workflow setup${C.reset}    Extract your design system`);
  print(`    ${C.dim}/design-workflow spec${C.reset}     Spec a component or screen`);
  print(`    ${C.dim}/design-workflow design${C.reset}   Generate in Figma`);
  print(`    ${C.dim}/design-workflow review${C.reset}   Validate against spec`);
  print(`    ${C.dim}/design-workflow done${C.reset}     Archive & ship`);
  print(`    ${C.dim}/design-workflow drop${C.reset}    Abandon with preserved learnings`);
  print(`    ${C.dim}/design-workflow learn${C.reset}   Diff corrections, extract learnings`);
  print(`    ${C.dim}/design-workflow sync${C.reset}    Incremental DS sync`);
  print(`    ${C.dim}/design-workflow status${C.reset}  Show current state, suggest next`);
  print('');
}

function cmdVersion() {
  const pkg = require('../package.json');
  print(`bridge-ds v${pkg.version}`);
}

// ── Router ───────────────────────────────────────────────

async function run(args) {
  const cmd = args[0] || 'help';

  switch (cmd) {
    case 'init': return cmdInit();
    case 'update': return cmdUpdate();
    case 'help': case '--help': case '-h': return cmdHelp();
    case 'version': case '--version': case '-v': return cmdVersion();
    default:
      fail(`Unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
}

module.exports = { run };
