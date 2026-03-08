# Bridge for Claude Code — Community Listing

## Tagline (max 100 chars)
Design in Figma from your terminal. Connect Claude Code to the Figma Plugin API via WebSocket.

## Description

Bridge connects Claude Code (or any terminal tool) to the Figma Plugin API via a local WebSocket server.

Write scripts that create frames, import components, bind variables, apply text styles — all from your terminal. No copy-pasting, no manual work.

### How it works

1. Start the Bridge server on your machine (Node.js)
2. Open this plugin in Figma — it auto-connects to the server
3. Send scripts from Claude Code (or curl) — they execute directly in Figma

```
Terminal → Bridge Server (localhost:9001) → This Plugin → Figma API
```

### What you can do

- Create frames with auto-layout, spacing, and radius
- Import components from your team library by key
- Bind design tokens (variables) to any property
- Apply text styles from your library
- Clone frames, create variants, set component properties
- Run any Figma Plugin API code remotely

### Setup

```
git clone https://github.com/noemuch/bridge.git
cd bridge && npm install --prefix server
node server/server.js
```

Then open this plugin in Figma. That's it.

Full documentation: https://github.com/noemuch/bridge

### Works with

- Claude Code (Anthropic)
- Any tool that can make HTTP requests
- Shell scripts, CI pipelines, custom tools

### Privacy

All traffic stays on localhost. The plugin connects to your local machine only (localhost:9001). No data is sent to external servers.

## Tags
- developer-tools
- automation
- design-systems
- ai
- api

## Category
Development

## Cover image specs
- Size: 1920 x 960 px
- Format: PNG or JPG

## Icon specs
- Size: 128 x 128 px
- Format: PNG or SVG
