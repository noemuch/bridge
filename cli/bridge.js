#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const http = require("http");

// ─── Colors ───

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

const BRIDGE_HOME = path.join(process.env.HOME, ".bridge");
const PLUGIN_URL = "https://www.figma.com/community/plugin/1612231505398639330";
const PORT = process.env.BRIDGE_PORT || 9001;

// ─── Helpers ───

function print(msg = "") {
  console.log(msg);
}

function step(n, total, title) {
  print(`\n  ${BOLD}Step ${n}/${total} — ${title}${RESET}`);
}

function success(msg) {
  print(`  ${GREEN}✓${RESET} ${msg}`);
}

function info(msg) {
  print(`  ${YELLOW}→${RESET} ${msg}`);
}

function error(msg) {
  print(`  ${RED}✗${RESET} ${msg}`);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`  ${question}`, (answer) => {
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

async function waitForConnection(timeoutMs = 120000) {
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

async function cmdInit() {
  print();
  print(`  ${BOLD}Bridge for Claude Code${RESET}`);
  print(`  ${DIM}Project setup${RESET}`);

  const totalSteps = 4;

  // ─── Step 1: Plugin ───

  step(1, totalSteps, "Figma Plugin");
  print(`  Install "Bridge for Claude Code" from Figma Community:`);
  print(`  ${CYAN}${PLUGIN_URL}${RESET}`);
  print();
  await ask("Press Enter when installed... ");
  success("Plugin installed");

  // ─── Step 2: Connection ───

  step(2, totalSteps, "Connection Test");

  let serverProcess = null;
  if (!serverRunning()) {
    info("Starting Bridge server on port " + PORT + "...");
    serverProcess = spawn("node", [path.join(BRIDGE_HOME, "server", "server.js")], {
      stdio: "ignore",
      detached: true,
    });
    serverProcess.unref();
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    info("Bridge server already running on port " + PORT);
  }

  print(`  Open your Figma file and run the Bridge plugin.`);
  print(`  ${DIM}Waiting for connection...${RESET}`);

  const connected = await waitForConnection();
  if (!connected) {
    error("Connection timeout. Make sure the Bridge plugin is running in Figma.");
    process.exit(1);
  }
  success("Connected to Figma!");

  // ─── Step 3: DS Extraction ───

  step(3, totalSteps, "Design System (optional)");
  const extractAnswer = await ask("Extract your DS keys from the current Figma file? (y/n) ");

  const projectDir = path.join(process.cwd(), ".bridge");

  if (extractAnswer.toLowerCase() === "y") {
    fs.mkdirSync(path.join(projectDir, "registries"), { recursive: true });

    // Extract components
    info("Extracting components...");
    try {
      const compScript = fs.readFileSync(
        path.join(BRIDGE_HOME, "extract", "extract-components.js"),
        "utf8"
      );
      const compResult = await postCommand(compScript);
      const compData = compResult.result || compResult;
      fs.writeFileSync(
        path.join(projectDir, "registries", "components.json"),
        JSON.stringify(compData, null, 2)
      );
      success(`Components: ${compData.count || "?"} found`);
    } catch (e) {
      error("Components extraction failed: " + e.message);
    }

    // Extract variables
    info("Extracting variables...");
    try {
      const varScript = fs.readFileSync(
        path.join(BRIDGE_HOME, "extract", "extract-variables.js"),
        "utf8"
      );
      const varResult = await postCommand(varScript);
      const varData = varResult.result || varResult;
      fs.writeFileSync(
        path.join(projectDir, "registries", "variables.json"),
        JSON.stringify(varData, null, 2)
      );
      success(`Variables: ${varData.count || "?"} found`);
    } catch (e) {
      error("Variables extraction failed: " + e.message);
    }

    // Extract text styles
    info("Extracting text styles...");
    try {
      const tsScript = fs.readFileSync(
        path.join(BRIDGE_HOME, "extract", "extract-text-styles.js"),
        "utf8"
      );
      const tsResult = await postCommand(tsScript);
      const tsData = tsResult.result || tsResult;
      fs.writeFileSync(
        path.join(projectDir, "registries", "text-styles.json"),
        JSON.stringify(tsData, null, 2)
      );
      success(`Text styles: ${tsData.count || "?"} found`);
    } catch (e) {
      error("Text styles extraction failed: " + e.message);
    }

    success("Registries saved to .bridge/registries/");
  } else {
    info("Skipped. You can run 'bridge extract' later.");
  }

  // ─── Step 4: CLAUDE.md ───

  step(4, totalSteps, "Project Setup");

  const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
  const hasExistingClaudeMd = fs.existsSync(claudeMdPath);

  let claudeContent = generateClaudeMd(projectDir);

  if (hasExistingClaudeMd) {
    const existing = fs.readFileSync(claudeMdPath, "utf8");
    if (existing.includes("Bridge")) {
      info("CLAUDE.md already contains Bridge instructions. Skipping.");
    } else {
      fs.appendFileSync(claudeMdPath, "\n\n" + claudeContent);
      success("Bridge instructions appended to existing CLAUDE.md");
    }
  } else {
    fs.writeFileSync(claudeMdPath, claudeContent);
    success("Generated CLAUDE.md with Bridge instructions");
  }

  // Add .bridge to .gitignore if not already there
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignore.includes(".bridge/")) {
      fs.appendFileSync(gitignorePath, "\n# Bridge for Claude Code\n.bridge/\n");
      success("Added .bridge/ to .gitignore");
    }
  }

  // ─── Done ───

  print();
  print(`  ${GREEN}${BOLD}Setup complete!${RESET}`);
  print();
  print(`  ${BOLD}Start designing:${RESET}`);
  print(`  ${CYAN}bridge start${RESET}        ${DIM}← start the server (if not running)${RESET}`);
  print(`  ${CYAN}claude${RESET}              ${DIM}← open Claude Code and start designing${RESET}`);
  print();
}

async function cmdStart() {
  print();
  print(`  ${BOLD}Bridge Server${RESET}`);

  if (serverRunning()) {
    try {
      const status = await fetchJSON(`http://localhost:${PORT}/status`);
      if (status.connected) {
        success(`Already running on port ${PORT} — Figma connected`);
      } else {
        success(`Already running on port ${PORT} — waiting for Figma plugin`);
      }
    } catch {
      success(`Already running on port ${PORT}`);
    }
    print();
    return;
  }

  info(`Starting on port ${PORT}...`);
  print();

  // Run server in foreground so user sees logs
  const serverPath = path.join(BRIDGE_HOME, "server", "server.js");
  const server = spawn("node", [serverPath], {
    stdio: "inherit",
    env: { ...process.env, BRIDGE_PORT: String(PORT) },
  });

  server.on("close", (code) => {
    if (code !== 0) {
      error(`Server exited with code ${code}`);
    }
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    server.kill("SIGINT");
    process.exit(0);
  });
}

async function cmdExtract() {
  print();
  print(`  ${BOLD}Extract Design System${RESET}`);

  if (!serverRunning()) {
    error("Bridge server not running. Start it with: bridge start");
    process.exit(1);
  }

  try {
    const status = await fetchJSON(`http://localhost:${PORT}/status`);
    if (!status.connected) {
      error("Figma plugin not connected. Open Bridge plugin in Figma.");
      process.exit(1);
    }
  } catch {
    error("Cannot reach Bridge server.");
    process.exit(1);
  }

  const projectDir = path.join(process.cwd(), ".bridge");
  fs.mkdirSync(path.join(projectDir, "registries"), { recursive: true });

  const extractions = [
    { name: "components", file: "extract-components.js" },
    { name: "variables", file: "extract-variables.js" },
    { name: "text-styles", file: "extract-text-styles.js" },
  ];

  for (const ext of extractions) {
    info(`Extracting ${ext.name}...`);
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
      success(`${ext.name}: ${data.count || "?"} found`);
    } catch (e) {
      error(`${ext.name} failed: ${e.message}`);
    }
  }

  print();
  success("Registries saved to .bridge/registries/");
  print(`  ${DIM}Re-run 'bridge extract' anytime your DS is updated.${RESET}`);
  print();
}

function cmdHelp() {
  print();
  print(`  ${BOLD}Bridge for Claude Code${RESET}`);
  print(`  ${DIM}Design in Figma from your terminal${RESET}`);
  print();
  print(`  ${BOLD}Commands:${RESET}`);
  print(`  ${CYAN}bridge init${RESET}       Interactive project setup`);
  print(`  ${CYAN}bridge start${RESET}      Start the Bridge server`);
  print(`  ${CYAN}bridge extract${RESET}    Extract DS keys from current Figma file`);
  print(`  ${CYAN}bridge help${RESET}       Show this help`);
  print();
  print(`  ${BOLD}Options:${RESET}`);
  print(`  ${DIM}BRIDGE_PORT=9002 bridge start${RESET}   Use custom port`);
  print();
  print(`  ${BOLD}Links:${RESET}`);
  print(`  Plugin:  ${CYAN}${PLUGIN_URL}${RESET}`);
  print(`  GitHub:  ${CYAN}https://github.com/noe-finary/bridge${RESET}`);
  print();
}

// ─── CLAUDE.md Generator ───

function generateClaudeMd(projectDir) {
  const registriesDir = path.join(projectDir, "registries");
  let dsSection = "";

  // If registries exist, include a summary
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
      // ignore parse errors
    }
  }

  return `# Bridge for Claude Code

This project uses Bridge to generate Figma designs from Claude Code.

## Setup

\`\`\`bash
bridge start        # Start the Bridge server
# Open Figma > Plugins > Bridge for Claude Code
\`\`\`

## Sending Commands

Every command MUST include \`"action": "runScript"\`. Without it, the plugin silently ignores the message.

\`\`\`bash
cat script.js | jq -Rs '{"action":"runScript","code":.}' | \\
  curl -s --max-time 60 -X POST http://localhost:${PORT}/command \\
  -H "Content-Type: application/json" -d @-
\`\`\`

## Script Structure

\`\`\`javascript
return (async function() {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  // ... your code ...
  return { success: true };
})();
\`\`\`

## Key Rules

1. **FILL after appendChild** — append first, then set \`layoutSizingHorizontal = "FILL"\`
2. **resize() before sizing modes** — \`resize()\` overrides modes back to FIXED
3. **Colors via setBoundVariableForPaint** — not \`setBoundVariable\`
4. **loadFontAsync before text** — always load fonts first
5. **textAutoResize after width** — set characters, append, FILL, then \`textAutoResize = "HEIGHT"\`
6. **Atomic generation** — split into 4-6 small steps, verify with screenshot between each

## Helpers

\`\`\`javascript
function mf(colorVar) {
  var p = figma.util.solidPaint("#000000");
  p = figma.variables.setBoundVariableForPaint(p, "color", colorVar);
  return [p];
}

function appendFill(parent, child, fillH, fillV) {
  parent.appendChild(child);
  if (fillH) child.layoutSizingHorizontal = "FILL";
  if (fillV) child.layoutSizingVertical = "FILL";
}
\`\`\`
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
