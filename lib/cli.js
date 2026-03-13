const path = require('path');
const { scaffold, update } = require('./scaffold');
const { checkMcp, setupMcp } = require('./mcp-setup');

// ── Branding ──────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  orange: '\x1b[38;2;237;112;46m',
  green: '\x1b[38;2;76;175;80m',
  red: '\x1b[38;2;244;67;54m',
  yellow: '\x1b[38;2;255;193;7m',
  gray: '\x1b[38;2;158;158;158m',
  white: '\x1b[38;2;255;255;255m',
};

function print(msg = '') { process.stdout.write(msg + '\n'); }
function header(msg) { print(`\n${C.orange}${C.bold}🧱 ${msg}${C.reset}\n`); }
function success(msg) { print(`${C.green}  ✓ ${msg}${C.reset}`); }
function info(msg) { print(`${C.white}  ℹ ${msg}${C.reset}`); }
function warn(msg) { print(`${C.yellow}  ⚠ ${msg}${C.reset}`); }
function error(msg) { print(`${C.red}  ✗ ${msg}${C.reset}`); }
function muted(msg) { print(`${C.gray}    ${msg}${C.reset}`); }
function step(n, total, msg) { print(`${C.orange}  [${n}/${total}]${C.reset} ${C.bold}${msg}${C.reset}`); }

// ── Spinner ───────────────────────────────────────────────
const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
class Spinner {
  constructor(msg) { this.msg = msg; this.i = 0; this.id = null; }
  start() {
    this.id = setInterval(() => {
      process.stdout.write(`\r${C.orange}  ${FRAMES[this.i++ % FRAMES.length]}${C.reset} ${this.msg}`);
    }, 80);
    return this;
  }
  stop(result) {
    clearInterval(this.id);
    process.stdout.write('\r' + ' '.repeat(this.msg.length + 10) + '\r');
    if (result) success(result);
  }
}

// ── ASCII Art ─────────────────────────────────────────────
function banner() {
  print('');
  print(`${C.orange}${C.bold}  ┌──────────────────────────────────────┐${C.reset}`);
  print(`${C.orange}${C.bold}  │  🧱  Bridge DS                       │${C.reset}`);
  print(`${C.orange}${C.bold}  │  AI-powered design in Figma           │${C.reset}`);
  print(`${C.orange}${C.bold}  │  100% design system compliant         │${C.reset}`);
  print(`${C.orange}${C.bold}  └──────────────────────────────────────┘${C.reset}`);
  print('');
}

// ── Commands ──────────────────────────────────────────────

async function cmdInit() {
  banner();
  header('Initializing Bridge DS');

  const cwd = process.cwd();
  const totalSteps = 4;

  // Step 1: Check prerequisites
  step(1, totalSteps, 'Checking prerequisites');
  const nodeVersion = process.version.replace('v', '').split('.').map(Number);
  if (nodeVersion[0] < 18) {
    error(`Node.js 18+ required (found ${process.version})`);
    process.exit(1);
  }
  success(`Node.js ${process.version}`);

  // Step 2: Configure figma-console-mcp
  step(2, totalSteps, 'Checking figma-console-mcp');
  const mcpConfigured = checkMcp();
  if (mcpConfigured) {
    success('figma-console-mcp is configured');
  } else {
    warn('figma-console-mcp not found in Claude Code settings');
    info('Run this command to add it:');
    print('');
    print(`${C.dim}    claude mcp add figma-console -s user \\${C.reset}`);
    print(`${C.dim}      -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN \\${C.reset}`);
    print(`${C.dim}      -- npx -y figma-console-mcp@latest${C.reset}`);
    print('');
    info('Then re-run: bridge-ds init');
    info('Continuing with file setup...');
  }

  // Step 3: Scaffold project files
  step(3, totalSteps, 'Scaffolding project files');
  const spinner = new Spinner('Copying skills, commands, templates...').start();
  const result = scaffold(cwd);
  spinner.stop('Project files created');

  for (const f of result.created) {
    muted(f);
  }

  // Step 4: Summary
  step(4, totalSteps, 'Done!');
  print('');
  print(`${C.orange}${C.bold}  ┌──────────────────────────────────────┐${C.reset}`);
  print(`${C.orange}${C.bold}  │  Setup complete!                      │${C.reset}`);
  print(`${C.orange}${C.bold}  │                                       │${C.reset}`);
  print(`${C.orange}${C.bold}  │  Next steps:                          │${C.reset}`);
  print(`${C.orange}${C.bold}  │  1. Open Claude Code in this project  │${C.reset}`);
  print(`${C.orange}${C.bold}  │  2. Run: /design-workflow setup       │${C.reset}`);
  print(`${C.orange}${C.bold}  │     → Extracts & documents your DS    │${C.reset}`);
  print(`${C.orange}${C.bold}  │  3. Run: /design-workflow spec ...    │${C.reset}`);
  print(`${C.orange}${C.bold}  │     → Start designing!                │${C.reset}`);
  print(`${C.orange}${C.bold}  └──────────────────────────────────────┘${C.reset}`);
  print('');
}

async function cmdUpdate() {
  banner();
  header('Updating Bridge DS skill files');

  const cwd = process.cwd();

  step(1, 2, 'Updating skill files');
  const spinner = new Spinner('Updating SKILL.md, actions, rules, schemas, templates...').start();
  const result = update(cwd);

  if (result.error) {
    spinner.stop();
    error(result.error);
    process.exit(1);
  }

  spinner.stop(`${result.updated.length} files updated`);

  for (const f of result.updated) {
    muted(f);
  }

  step(2, 2, 'Done!');
  print('');
  success('Skill files updated. Your knowledge base (registries, guides) was preserved.');
  info('No need to re-run /design-workflow setup.');
  print('');
}

function cmdHelp() {
  banner();
  print(`${C.bold}  Commands:${C.reset}`);
  print('');
  print(`    ${C.orange}init${C.reset}       Initialize Bridge DS in current project`);
  print(`               Scaffolds skills, commands, and specs directories`);
  print('');
  print(`    ${C.orange}update${C.reset}     Update skill files to latest version`);
  print(`               Preserves your knowledge base (registries, guides)`);
  print('');
  print(`    ${C.orange}help${C.reset}       Show this help message`);
  print(`    ${C.orange}version${C.reset}    Show version`);
  print('');
  print(`${C.bold}  Usage:${C.reset}`);
  print('');
  print(`    ${C.dim}npx @noemuch/bridge-ds init${C.reset}     # Initialize in current project`);
  print(`    ${C.dim}npx @noemuch/bridge-ds update${C.reset}   # Update skill files only`);
  print(`    ${C.dim}bridge-ds help${C.reset}                  # Show help`);
  print('');
  print(`${C.bold}  After init:${C.reset}`);
  print('');
  print(`    ${C.dim}/design-workflow setup${C.reset}  # Extract & document your DS (in Claude Code)`);
  print(`    ${C.dim}/design-workflow spec${C.reset}   # Spec a component or screen`);
  print(`    ${C.dim}/design-workflow design${C.reset} # Generate in Figma`);
  print(`    ${C.dim}/design-workflow review${C.reset} # Validate against spec`);
  print(`    ${C.dim}/design-workflow done${C.reset}   # Archive & ship`);
  print('');
}

function cmdVersion() {
  const pkg = require('../package.json');
  print(`bridge-ds v${pkg.version}`);
}

// ── Router ────────────────────────────────────────────────

async function run(args) {
  const cmd = args[0] || 'help';

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'update':
      await cmdUpdate();
      break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      cmdVersion();
      break;
    default:
      error(`Unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
}

module.exports = { run };
