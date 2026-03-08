#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const http = require("http");

// ─── Brand Colors ───

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const ITALIC = "\x1b[3m";
const RESET = "\x1b[0m";

// Custom palette
const ACCENT = "\x1b[38;2;237;112;46m";      // orange #ED702E
const SUCCESS = "\x1b[38;2;34;197;94m";      // green #22c55e
const WARN = "\x1b[38;2;250;204;21m";        // yellow #facc15
const ERROR = "\x1b[38;2;239;68;68m";        // red #ef4444
const MUTED = "\x1b[38;2;107;114;128m";      // gray #6b7280
const INFO = "\x1b[38;2;245;166;35m";        // light orange #F5A623
const WHITE = "\x1b[38;2;243;244;246m";      // near-white #f3f4f6

const BRIDGE_HOME = path.join(process.env.HOME, ".bridge");
const PLUGIN_URL = "https://www.figma.com/community/plugin/1612231505398639330";
const PORT = process.env.BRIDGE_PORT || 9001;

// ─── ASCII Art ───

const LOGO = `
${ACCENT}  ┌──────────────────────────────────────┐
  │${RESET}  🧱 ${BOLD}Bridge for Claude Code${RESET}            ${ACCENT}│
  │${RESET}${MUTED}     Design in Figma from your terminal ${RESET}${ACCENT}│
  └──────────────────────────────────────┘${RESET}
`;

const LOGO_SMALL = `  🧱 ${ACCENT}${BOLD}bridge${RESET}`;

// ─── Spinner ───

class Spinner {
  constructor(text) {
    this.text = text;
    this.frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    this.i = 0;
    this.interval = null;
  }

  start() {
    process.stdout.write("\x1b[?25l"); // hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.i % this.frames.length];
      process.stdout.write(`\r  ${ACCENT}${frame}${RESET} ${this.text}`);
      this.i++;
    }, 80);
    return this;
  }

  succeed(text) {
    this.stop();
    process.stdout.write(`\r  ${SUCCESS}✓${RESET} ${text || this.text}\n`);
  }

  fail(text) {
    this.stop();
    process.stdout.write(`\r  ${ERROR}✗${RESET} ${text || this.text}\n`);
  }

  update(text) {
    this.text = text;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write("\x1b[?25h"); // show cursor
    process.stdout.write("\r\x1b[K");  // clear line
  }
}

// ─── Helpers ───

function print(msg = "") {
  console.log(msg);
}

function header(n, total, title) {
  print();
  print(`  ${ACCENT}${BOLD}[${n}/${total}]${RESET} ${BOLD}${title}${RESET}`);
  print(`  ${MUTED}${"─".repeat(40)}${RESET}`);
}

function success(msg) {
  print(`  ${SUCCESS}✓${RESET} ${msg}`);
}

function info(msg) {
  print(`  ${INFO}→${RESET} ${msg}`);
}

function warn(msg) {
  print(`  ${WARN}!${RESET} ${msg}`);
}

function error(msg) {
  print(`  ${ERROR}✗${RESET} ${msg}`);
}

function muted(msg) {
  print(`  ${MUTED}${msg}${RESET}`);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`  ${WHITE}${question}${RESET}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function postCommand(code) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ action: "runScript", code });
    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        path: "/command",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 60000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(payload);
    req.end();
  });
}

async function waitForConnection(spinner, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await fetchJSON(`http://localhost:${PORT}/status`);
      if (status.connected) return true;
    } catch (e) {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function serverRunning() {
  try {
    execSync(`curl -s http://localhost:${PORT}/status`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ─── Commands ───

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function cmdInit() {
  print(LOGO);

  const totalSteps = 6;
  const projectDir = path.join(process.cwd(), ".bridge");

  // ─── Step 1: Plugin ───

  header(1, totalSteps, "Figma Plugin");
  print();
  print(`  Install ${BOLD}"Bridge for Claude Code"${RESET} from Figma Community:`);
  print();
  print(`  ${ACCENT}${PLUGIN_URL}${RESET}`);
  print();
  await ask(`Press ${BOLD}Enter${RESET} when installed... `);
  success("Plugin ready");

  // ─── Step 2: Connection ───

  header(2, totalSteps, "Connection");

  let serverProcess = null;
  if (!serverRunning()) {
    const spinner = new Spinner("Starting Bridge server...").start();
    serverProcess = spawn("node", [path.join(BRIDGE_HOME, "server", "server.js")], {
      stdio: "ignore",
      detached: true,
    });
    serverProcess.unref();
    await new Promise((r) => setTimeout(r, 1500));
    spinner.succeed(`Server running on port ${PORT}`);
  } else {
    success(`Server already running on port ${PORT}`);
  }

  print();
  print(`  Open your Figma file and run the Bridge plugin.`);
  print();

  const spinner = new Spinner("Waiting for Figma connection...").start();
  const connected = await waitForConnection(spinner);

  if (!connected) {
    spinner.fail("Connection timeout");
    print();
    error("Make sure the Bridge plugin is running in Figma.");
    muted("The plugin auto-connects when the server is running.");
    process.exit(1);
  }

  spinner.succeed("Connected to Figma");

  // ─── Step 3: DS Extraction ───

  header(3, totalSteps, "Design System Extraction");
  print();
  print(`  Extract component keys, variable keys, and text styles`);
  print(`  from the Figma file currently open.`);
  print();

  const extractAnswer = await ask(`Extract your DS? ${MUTED}(y/n)${RESET} `);

  if (extractAnswer.toLowerCase() === "y") {
    fs.mkdirSync(path.join(projectDir, "registries"), { recursive: true });

    const extractions = [
      { name: "components", file: "extract-components.js", label: "Components" },
      { name: "variables", file: "extract-variables.js", label: "Variables" },
      { name: "text-styles", file: "extract-text-styles.js", label: "Text styles" },
    ];

    for (const ext of extractions) {
      const s = new Spinner(`Extracting ${ext.label.toLowerCase()}...`).start();
      try {
        const script = fs.readFileSync(
          path.join(BRIDGE_HOME, "extract", ext.file),
          "utf8"
        );
        const result = await postCommand(script);
        const data = result.result || result;
        fs.writeFileSync(
          path.join(projectDir, "registries", `${ext.name}.json`),
          JSON.stringify(data, null, 2)
        );
        s.succeed(`${ext.label}: ${BOLD}${data.count || "?"}${RESET} found`);
      } catch (e) {
        s.fail(`${ext.label}: ${e.message}`);
      }
    }

    print();
    success(`Registries saved to ${MUTED}.bridge/registries/${RESET}`);
  } else {
    muted("Skipped. Run 'bridge extract' anytime.");
  }

  // ─── Step 4: Workflow Setup ───

  header(4, totalSteps, "Workflow & Rules");

  const workflowSrc = path.join(BRIDGE_HOME, "workflow");

  // Copy workflow files
  const dirs = ["actions", "templates", "rules", "guides"];
  for (const dir of dirs) {
    const src = path.join(workflowSrc, dir);
    const dest = path.join(projectDir, dir);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
    }
  }

  // Copy SKILL.md
  const skillSrc = path.join(workflowSrc, "SKILL.md");
  if (fs.existsSync(skillSrc)) {
    fs.copyFileSync(skillSrc, path.join(projectDir, "SKILL.md"));
  }

  success(`Workflow files installed`);
  muted("actions/ — spec, design, review, done, drop");
  muted("templates/ — component & screen spec templates");
  muted("rules/ — Figma API rules & quality gates");
  muted("guides/ — knowledge base (to build with Claude)");

  // Create specs directory structure
  const specsDirs = ["specs/active", "specs/backlog", "specs/shipped", "specs/dropped"];
  for (const dir of specsDirs) {
    fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
  }

  // Create history.log if missing
  const historyLog = path.join(process.cwd(), "specs", "history.log");
  if (!fs.existsSync(historyLog)) {
    fs.writeFileSync(historyLog, "");
  }

  success(`Specs directory created`);

  // Create ui-references directory
  fs.mkdirSync(path.join(projectDir, "ui-references"), { recursive: true });

  // ─── Step 5: Knowledge Base ───

  header(5, totalSteps, "Knowledge Base");
  print();
  print(`  The knowledge base makes Claude understand your DS deeply.`);
  print(`  It includes token guides, component guides, and design patterns.`);
  print();
  print(`  ${BOLD}How it works:${RESET}`);
  print(`  ${MUTED}1.${RESET} Claude analyzes your extracted registries`);
  print(`  ${MUTED}2.${RESET} Claude generates token & component guides`);
  print(`  ${MUTED}3.${RESET} You provide UI screenshots → Claude maps design patterns`);
  print();
  print(`  ${INFO}This step happens in Claude Code after init.${RESET}`);
  print(`  ${INFO}Claude will guide you through it interactively.${RESET}`);
  print();

  success(`Knowledge base structure ready`);
  muted("Guides will be generated by Claude in your first session");

  // ─── Step 6: CLAUDE.md ───

  header(6, totalSteps, "Project Config");

  const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
  const hasExistingClaudeMd = fs.existsSync(claudeMdPath);

  let claudeContent = generateClaudeMd(projectDir);

  if (hasExistingClaudeMd) {
    const existing = fs.readFileSync(claudeMdPath, "utf8");
    if (existing.includes("Bridge")) {
      info("CLAUDE.md already has Bridge instructions");
    } else {
      fs.appendFileSync(claudeMdPath, "\n\n" + claudeContent);
      success("Appended Bridge instructions to CLAUDE.md");
    }
  } else {
    fs.writeFileSync(claudeMdPath, claudeContent);
    success("Created CLAUDE.md");
  }

  // .gitignore
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignore.includes(".bridge/")) {
      fs.appendFileSync(gitignorePath, "\n# 🧱 Bridge for Claude Code\n.bridge/\n");
      success("Added .bridge/ to .gitignore");
    }
  }

  // ─── Done ───

  print();
  print(`  ${ACCENT}┌─────────────────────────────────────────────┐${RESET}`);
  print(`  ${ACCENT}│${RESET}  🧱 ${SUCCESS}${BOLD}Setup complete!${RESET}                          ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}                                             ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}  ${BOLD}Next steps:${RESET}                                ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}  ${WHITE}1.${RESET} ${MUTED}Add screenshots to${RESET} ${WHITE}.bridge/ui-references${RESET} ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}  ${WHITE}2.${RESET} ${MUTED}Open Claude Code and say:${RESET}               ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}     ${WHITE}"Build my knowledge base"${RESET}              ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}  ${WHITE}3.${RESET} ${MUTED}Then start designing:${RESET} ${WHITE}spec {name}${RESET}      ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}│${RESET}                                             ${ACCENT}│${RESET}`);
  print(`  ${ACCENT}└─────────────────────────────────────────────┘${RESET}`);
  print();
}

async function cmdStart() {
  print(LOGO_SMALL);
  print();

  if (serverRunning()) {
    try {
      const status = await fetchJSON(`http://localhost:${PORT}/status`);
      if (status.connected) {
        success(`Running on port ${PORT} — ${SUCCESS}Figma connected${RESET}`);
      } else {
        success(`Running on port ${PORT} — ${WARN}waiting for Figma${RESET}`);
        muted("Open your Figma file and run the Bridge plugin.");
      }
    } catch {
      success(`Running on port ${PORT}`);
    }
    print();
    return;
  }

  info(`Starting on port ${PORT}...`);
  print();

  const serverPath = path.join(BRIDGE_HOME, "server", "server.js");
  const server = spawn("node", [serverPath], {
    stdio: "inherit",
    env: { ...process.env, BRIDGE_PORT: String(PORT) },
  });

  server.on("close", (code) => {
    if (code !== 0 && code !== null) {
      error(`Server exited with code ${code}`);
    }
  });

  process.on("SIGINT", () => {
    server.kill("SIGINT");
    process.exit(0);
  });
}

async function cmdExtract() {
  print(LOGO_SMALL);
  print();

  if (!serverRunning()) {
    error("Server not running");
    muted("Start it with: bridge start");
    process.exit(1);
  }

  try {
    const status = await fetchJSON(`http://localhost:${PORT}/status`);
    if (!status.connected) {
      error("Figma not connected");
      muted("Open the Bridge plugin in Figma.");
      process.exit(1);
    }
  } catch {
    error("Cannot reach server");
    process.exit(1);
  }

  const projectDir = path.join(process.cwd(), ".bridge");
  fs.mkdirSync(path.join(projectDir, "registries"), { recursive: true });

  print(`  ${BOLD}Extracting from current Figma file...${RESET}`);
  print();

  const extractions = [
    { name: "components", file: "extract-components.js", label: "Components" },
    { name: "variables", file: "extract-variables.js", label: "Variables" },
    { name: "text-styles", file: "extract-text-styles.js", label: "Text styles" },
  ];

  for (const ext of extractions) {
    const s = new Spinner(`Extracting ${ext.label.toLowerCase()}...`).start();
    try {
      const script = fs.readFileSync(
        path.join(BRIDGE_HOME, "extract", ext.file),
        "utf8"
      );
      const result = await postCommand(script);
      const data = result.result || result;
      fs.writeFileSync(
        path.join(projectDir, "registries", `${ext.name}.json`),
        JSON.stringify(data, null, 2)
      );
      s.succeed(`${ext.label}: ${BOLD}${data.count || "?"}${RESET} found`);
    } catch (e) {
      s.fail(`${ext.label}: ${e.message}`);
    }
  }

  print();
  success(`Saved to ${MUTED}.bridge/registries/${RESET}`);
  muted("Re-run anytime your DS is updated.");
  print();
}

function cmdHelp() {
  print(LOGO);
  print(`  ${BOLD}Commands${RESET}`);
  print(`  ${MUTED}${"─".repeat(40)}${RESET}`);
  print(`  ${WHITE}bridge init${RESET}       ${MUTED}Interactive project setup${RESET}`);
  print(`  ${WHITE}bridge start${RESET}      ${MUTED}Start the Bridge server${RESET}`);
  print(`  ${WHITE}bridge extract${RESET}    ${MUTED}Extract DS keys from Figma${RESET}`);
  print(`  ${WHITE}bridge help${RESET}       ${MUTED}Show this message${RESET}`);
  print();
  print(`  ${BOLD}Options${RESET}`);
  print(`  ${MUTED}${"─".repeat(40)}${RESET}`);
  print(`  ${WHITE}BRIDGE_PORT=9002 bridge start${RESET}`);
  print(`  ${MUTED}Use a custom port${RESET}`);
  print();
  print(`  ${BOLD}Links${RESET}`);
  print(`  ${MUTED}${"─".repeat(40)}${RESET}`);
  print(`  ${MUTED}Plugin${RESET}   ${ACCENT}${PLUGIN_URL}${RESET}`);
  print(`  ${MUTED}GitHub${RESET}   ${ACCENT}https://github.com/noemuch/bridge${RESET}`);
  print();
}

// ─── CLAUDE.md Generator ───

function generateClaudeMd(projectDir) {
  const registriesDir = path.join(projectDir, "registries");
  let dsSection = "";

  if (fs.existsSync(path.join(registriesDir, "components.json"))) {
    try {
      const comp = JSON.parse(
        fs.readFileSync(path.join(registriesDir, "components.json"), "utf8")
      );
      dsSection += `\n## Design System — ${comp.count || "?"} components extracted\n\n`;
      dsSection += `Registries are in \`.bridge/registries/\`. Key files:\n`;
      dsSection += `- \`components.json\` — component keys for \`importComponentByKeyAsync\`\n`;
      dsSection += `- \`variables.json\` — variable keys for \`importVariableByKeyAsync\`\n`;
      dsSection += `- \`text-styles.json\` — style keys for \`importStyleByKeyAsync\`\n`;
      dsSection += `\nLoad the relevant registry before generating scripts to get the correct keys.\n`;
    } catch {
      // ignore
    }
  }

  return `# 🧱 Bridge for Claude Code

This project uses Bridge to design in Figma from Claude Code, using your real design system.

## Workflow

**Spec-first, always.** No design without a validated specification.

\`\`\`
spec {name}  →  design  →  review  →  done
\`\`\`

Read \`.bridge/SKILL.md\` for the complete workflow reference.

## Commands

| Command | What it does |
|---------|-------------|
| \`spec {name}\` | Write a component or screen spec |
| \`design\` | Generate Figma design from active spec |
| \`review\` | Validate design against spec |
| \`done\` | Archive spec as shipped |
| \`drop\` | Abandon with learnings |
| \`status\` | Show current state |

## Bridge Setup

\`\`\`bash
bridge start        # Start the Bridge server
# Open Figma > Plugins > Bridge for Claude Code
\`\`\`

## Before Writing Any Script

1. **Read \`.bridge/rules/figma-api-rules.md\`** — mandatory patterns
2. **Load registries** — get the correct keys for components, variables, text styles
3. **Use atomic generation** — split into 4-6 small steps, verify with \`get_screenshot\` between each

## Sending Commands

Every command MUST include \`"action": "runScript"\`. Without it, the plugin silently ignores the message.

\`\`\`bash
cat script.js | jq -Rs '{"action":"runScript","code":.}' | \\
  curl -s --max-time 60 -X POST http://localhost:${PORT}/command \\
  -H "Content-Type: application/json" -d @-
\`\`\`

## Key References

| Reference | Path |
|-----------|------|
| Workflow | \`.bridge/SKILL.md\` |
| Figma API rules | \`.bridge/rules/figma-api-rules.md\` |
| Quality gates | \`.bridge/rules/quality-gates.md\` |
| Spec templates | \`.bridge/templates/\` |
| Design patterns | \`.bridge/guides/design-patterns.md\` |
| Token guides | \`.bridge/guides/tokens/\` |
| Component guides | \`.bridge/guides/components/\` |
| UI references | \`.bridge/ui-references/\` |
| Registries | \`.bridge/registries/\` |

## Knowledge Base Setup

If guides in \`.bridge/guides/\` are empty, ask the user to build the knowledge base:
1. Analyze registries → generate token & component guides
2. Study UI screenshots in \`.bridge/ui-references/\` → generate design patterns
3. This is a one-time collaborative setup that makes all future designs accurate
${dsSection}`;
}

// ─── Main ───

const command = process.argv[2] || "help";

switch (command) {
  case "init":
    cmdInit().catch((e) => {
      error(e.message);
      process.exit(1);
    });
    break;
  case "start":
    cmdStart().catch((e) => {
      error(e.message);
      process.exit(1);
    });
    break;
  case "extract":
    cmdExtract().catch((e) => {
      error(e.message);
      process.exit(1);
    });
    break;
  case "help":
  case "--help":
  case "-h":
    cmdHelp();
    break;
  default:
    error(`Unknown command: ${command}`);
    cmdHelp();
    process.exit(1);
}
