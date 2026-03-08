# Bridge

AI-powered design generation using your real design system components and tokens.

Bridge lets [Claude Code](https://claude.ai/download) design directly in Figma using your actual design system — real components, bound variables, and text styles. Not mockups, not screenshots — production-ready Figma layers.

```
Claude Code  -->  Bridge Server (:9001)  <--WebSocket-->  Figma Plugin  -->  Your Figma File
                                                                              (real DS components,
                                                                               bound variables,
                                                                               text styles)
```

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/noemuch/bridge/main/install.sh | bash
```

## Quick Start

```bash
cd your-project
bridge init
```

The interactive setup will:
1. Guide you to install the Figma plugin from [Community](https://www.figma.com/community/plugin/1612231505398639330)
2. Start the server and test the connection
3. Extract your DS keys (components, variables, text styles) from Figma
4. Generate a `CLAUDE.md` with Bridge instructions + your DS keys

Then open Claude Code and start designing.

## Commands

```bash
bridge init       # Interactive project setup
bridge start      # Start the Bridge server
bridge extract    # Extract DS keys from current Figma file
bridge help       # Show available commands
```

## Manual Setup

If you prefer not to use the install script:

```bash
git clone https://github.com/noemuch/bridge.git
cd bridge
npm install --prefix server
node server/server.js
```

Then install the plugin from [Figma Community](https://www.figma.com/community/plugin/1612231505398639330) or manually via `plugin/manifest.json`.

## Usage with Claude Code

Open Claude Code in any project and tell it to design in Figma. Bridge is the transport layer — Claude Code generates the Figma Plugin API scripts, Bridge executes them.

### Sending scripts

The `runScript` action executes arbitrary JavaScript in the Figma Plugin API context:

```bash
# From a file
cat my-script.js | jq -Rs '{"action":"runScript","code":.}' | \
  curl -s --max-time 60 -X POST http://localhost:9001/command \
  -H "Content-Type: application/json" -d @-

# Inline
curl -s -X POST http://localhost:9001/command \
  -H "Content-Type: application/json" \
  -d '{"action":"runScript","code":"return (async function() { var f = figma.createFrame(); f.name = \"hello\"; return { id: f.id }; })();"}'
```

**IMPORTANT**: Every command MUST include `"action": "runScript"`. Without it, the plugin silently ignores the message.

### Script structure

Every script sent via `runScript` should follow this pattern:

```javascript
return (async function() {
  // 1. Load fonts (required before any text operation)
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  // 2. Import variables, styles, components from your DS
  var myVar = await figma.variables.importVariableByKeyAsync("your-key");
  var myStyle = await figma.importStyleByKeyAsync("your-style-key");
  var myComponent = await figma.importComponentByKeyAsync("your-comp-key");

  // 3. Build your design
  var frame = figma.createFrame();
  frame.name = "my-frame";
  frame.layoutMode = "VERTICAL";
  frame.resize(400, 10);
  frame.primaryAxisSizingMode = "AUTO";

  // 4. Return results
  return { success: true, frameId: frame.id };
})();
```

The `return` before the IIFE is mandatory — without it, the Promise is lost and Bridge gets `undefined`.

### Other actions

Beyond `runScript`, Bridge supports granular actions:

| Action | Description |
|--------|-------------|
| `ping` | Check connection |
| `getSelection` | Info about current selection |
| `getNodeInfo` | Detailed info about a node |
| `getChildren` | List children of a node |
| `findByName` | Find nodes by name |
| `rename` | Rename a node |
| `resize` | Resize a node |
| `cloneNode` | Clone a node N times |
| `deleteNode` | Delete a node |
| `runScript` | Execute arbitrary Figma Plugin API code |

## Atomic Generation (recommended)

When generating complex designs, don't put everything in one huge script. Split into small sequential steps (~30-80 lines each):

| Step | What | Returns |
|------|------|---------|
| 1. Structure | Root frame + section frames (empty) | rootId, sectionIds |
| 2. Top bar / Nav | Populate nav with components | — |
| 3. Content | One step per major section | sectionId |
| 4. Details | Footer, labels, secondary elements | — |
| 5. States | Clone root + modify for additional states | stateIds |

**After each step**: take a screenshot (via [Figma MCP](https://www.npmjs.com/package/@anthropic-ai/mcp-figma) `get_screenshot`) to verify before proceeding. This is what makes atomic generation powerful — catch issues early, fix them cheaply.

## Using with your Design System

Bridge works with any Figma library. To import your DS components and variables, you need their keys.

### Extracting your DS keys

1. Start Bridge server + open your DS library file in Figma + run the plugin
2. Run the extraction scripts:

```bash
# Extract component keys
cat extract/extract-components.js | jq -Rs '{"action":"runScript","code":.}' | \
  curl -s --max-time 60 -X POST http://localhost:9001/command \
  -H "Content-Type: application/json" -d @- | jq '.result' > registries/components.json

# Extract variable keys
cat extract/extract-variables.js | jq -Rs '{"action":"runScript","code":.}' | \
  curl -s --max-time 60 -X POST http://localhost:9001/command \
  -H "Content-Type: application/json" -d @- | jq '.result' > registries/variables.json

# Extract text style keys
cat extract/extract-text-styles.js | jq -Rs '{"action":"runScript","code":.}' | \
  curl -s --max-time 60 -X POST http://localhost:9001/command \
  -H "Content-Type: application/json" -d @- | jq '.result' > registries/text-styles.json
```

3. The JSON files in `registries/` contain all the keys you need
4. Reference them in your CLAUDE.md so Claude Code knows your DS

## Figma Plugin API — Key Patterns

These patterns are learned from real bugs. Breaking them = broken layout.

### FILL after appendChild

```javascript
// WRONG — crashes
child.layoutSizingHorizontal = "FILL";
parent.appendChild(child);

// CORRECT — append first, then FILL
parent.appendChild(child);
child.layoutSizingHorizontal = "FILL";
```

### resize() overrides sizing modes

```javascript
// WRONG — resize overrides AUTO back to FIXED
frame.primaryAxisSizingMode = "AUTO";
frame.resize(700, 10);

// CORRECT — resize first, then set modes
frame.resize(700, 10);
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "FIXED";
```

### Colors via setBoundVariableForPaint

```javascript
// WRONG — setBoundVariable doesn't work for fills
frame.setBoundVariable('fills', colorVar);

// CORRECT — use setBoundVariableForPaint
var paint = figma.util.solidPaint("#000000");
paint = figma.variables.setBoundVariableForPaint(paint, "color", colorVar);
frame.fills = [paint];
```

### Text: set characters before textAutoResize

```javascript
// WRONG — 0-width text wraps vertically
var t = figma.createText();
t.textAutoResize = "HEIGHT";
t.characters = "Long text...";

// CORRECT — characters first, append, FILL, then textAutoResize
var t = figma.createText();
t.characters = "Long text...";
parent.appendChild(t);
t.layoutSizingHorizontal = "FILL";
t.textAutoResize = "HEIGHT";
```

### Always load fonts before text operations

```javascript
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
// THEN create or modify text nodes
```

See the full list of patterns in `CLAUDE.md`.

## How it works

```
┌─────────────────────┐
│ Claude Code (CLI)    │  curl POST /command
│ generates scripts    │──────────────────────┐
└─────────────────────┘                       │
                                              v
                               ┌──────────────────────┐
                               │ Bridge Server (:9001) │
                               │ Node.js HTTP + WS     │
                               └──────────┬───────────┘
                                          │ WebSocket
                                          v
                               ┌──────────────────────┐
                               │ Bridge Plugin (Figma) │
                               │ Executes scripts via  │
                               │ Figma Plugin API      │
                               └──────────┬───────────┘
                                          │
                                          v
                               ┌──────────────────────┐
                               │ Your Figma File       │
                               │ Frames, components,   │
                               │ variables, styles     │
                               └──────────────────────┘
```

1. **Claude Code** generates a Figma Plugin API script and sends it via HTTP
2. **Bridge Server** relays the command to the Figma plugin via WebSocket
3. **Bridge Plugin** executes the script in Figma's sandbox and returns the result
4. The result flows back: Plugin -> Server -> Claude Code

## Configuration

| Environment variable | Default | Description |
|---------------------|---------|-------------|
| `BRIDGE_PORT` | `9001` | Server port (HTTP + WebSocket) |

## FAQ

**Why not use the Figma REST API directly?**
The REST API can read files but not create layers or modify structure. Only the Plugin API (accessible from a plugin inside Figma) can create frames, import components, and bind variables.

**Why a WebSocket bridge?**
The Plugin API only runs inside Figma. Bridge creates a tunnel so external tools (Claude Code, scripts, CI) can execute Plugin API code remotely.

**Why atomic generation instead of one big script?**
Bug in step 3? Fix and re-run step 3 only. Screenshot after each step catches issues early. Fewer imports per script = less timeout risk.

**Can I use this without Claude Code?**
Yes. Bridge is just an HTTP/WebSocket server. Any tool that can `curl POST` can send commands to Figma.

## License

MIT
