# Schema: learnings.json

> **Read this BEFORE writing or updating learnings.json.**

---

## Purpose

`learnings.json` stores corrections the user makes to generated designs. When Bridge generates a design and the user manually fixes it in Figma, the `learn` action extracts those changes and persists them here. Future generations consult these learnings to avoid repeating the same mistakes.

---

## Required Structure

```json
{
  "meta": {
    "version": "1.0",
    "lastUpdated": "YYYY-MM-DD"
  },
  "learnings": [
    {
      "id": "l-YYYYMMDD-NNN",
      "scope": "contextual",
      "context": {
        "screenType": "settings",
        "component": "card",
        "section": "content"
      },
      "change": {
        "property": "itemSpacing",
        "from": { "token": "spacing/large", "value": 24 },
        "to": { "token": "spacing/medium", "value": 16 }
      },
      "rule": "For settings screens, cards use spacing/medium (not large).",
      "signals": 1,
      "history": [
        { "date": "2026-03-20", "spec": "settings-screen" }
      ]
    }
  ],
  "flags": [
    {
      "id": "f-YYYYMMDD-NNN",
      "spec": "settings-screen",
      "description": "Hardcoded hex #FF5722 on node 'StatusBadge'",
      "resolved": false
    }
  ]
}
```

---

## Field Requirements

### Top-level

| Field | Required | Description |
|-------|----------|-------------|
| `meta.version` | **YES** | Schema version (`"1.0"`) |
| `meta.lastUpdated` | **YES** | ISO date of last modification |
| `learnings` | **YES** | Array of DS-compliant changes detected (can be empty) |
| `flags` | **YES** | Array of non-DS-compliant changes that need user attention (can be empty) |

### Learning entry

| Field | Required | Description |
|-------|----------|-------------|
| `id` | **YES** | Unique ID: `l-YYYYMMDD-NNN` |
| `scope` | **YES** | `"contextual"` (screen/component-specific) or `"global"` (applies everywhere) |
| `context` | **YES** | Where this learning applies: `screenType`, `component`, `section` (all optional strings) |
| `change` | **YES** | What changed: `property`, `from` (token + value), `to` (token + value) |
| `change.property` | **YES** | Figma property name (e.g., `itemSpacing`, `fills`, `cornerRadius`) |
| `change.from` | **YES** | Original value: `{ "token": "...", "value": ... }` — token may be null if raw |
| `change.to` | **YES** | Corrected value: `{ "token": "...", "value": ... }` |
| `rule` | **YES** | Human-readable rule derived from the change |
| `signals` | **YES** | Number of times this correction has been observed |
| `history` | **YES** | Array of `{ "date", "spec" }` entries tracking each observation |

### Flag entry

| Field | Required | Description |
|-------|----------|-------------|
| `id` | **YES** | Unique ID: `f-YYYYMMDD-NNN` |
| `spec` | **YES** | Which spec triggered this flag |
| `description` | **YES** | What was changed and why it's flagged (e.g., hardcoded hex) |
| `resolved` | **YES** | `false` until user addresses it |

---

## Scope Promotion Rules

A learning starts as `"contextual"` and can be promoted to `"global"`:

1. **Threshold:** `signals >= 3` AND observations come from at least 2 different `screenType` values
2. **Contradiction check:** If the same `property` has learnings pointing to different `to` tokens → do NOT promote. Instead, flag for user review.
3. **On promotion:** Change `scope` to `"global"`, keep `context` for reference but it no longer restricts matching.

---

## Snapshot Structure

Snapshots are saved after design generation to enable diffing during `learn`.

**File:** `specs/active/{name}-snapshot.json`

```json
{
  "meta": {
    "spec": "settings-screen",
    "generatedAt": "YYYY-MM-DDTHH:mm:ss",
    "rootNodeId": "123:456",
    "fileKey": "abc123"
  },
  "tree": {
    "id": "123:456",
    "name": "Settings Screen",
    "type": "FRAME",
    "width": 1440,
    "height": 900,
    "layoutMode": "VERTICAL",
    "primaryAxisAlignItems": "MIN",
    "counterAxisAlignItems": "MIN",
    "itemSpacing": 0,
    "paddingTop": 0,
    "paddingBottom": 0,
    "paddingLeft": 0,
    "paddingRight": 0,
    "cornerRadius": 0,
    "boundVariables": {
      "itemSpacing": "spacing/large"
    },
    "fills": [
      { "type": "SOLID", "color": "#F5F5F5", "boundVariable": "color/background/neutral/default" }
    ],
    "componentKey": null,
    "componentName": null,
    "children": []
  }
}
```

### Node tree extraction script

Use this via `figma_execute` to extract the snapshot tree (max depth 10):

```js
return (async function() {
  var root = await figma.getNodeByIdAsync("ROOT_NODE_ID");
  if (!root) return { error: "Node not found" };

  function extractNode(node, depth) {
    if (depth > 10) return null;
    var data = {
      id: node.id,
      name: node.name,
      type: node.type,
      width: Math.round(node.width),
      height: Math.round(node.height)
    };
    if (node.layoutMode) {
      data.layoutMode = node.layoutMode;
      data.primaryAxisAlignItems = node.primaryAxisAlignItems;
      data.counterAxisAlignItems = node.counterAxisAlignItems;
      data.itemSpacing = node.itemSpacing;
      data.paddingTop = node.paddingTop;
      data.paddingBottom = node.paddingBottom;
      data.paddingLeft = node.paddingLeft;
      data.paddingRight = node.paddingRight;
    }
    if (node.cornerRadius !== undefined) data.cornerRadius = node.cornerRadius;
    // Bound variables
    var bv = {};
    try {
      var bindings = node.boundVariables || {};
      for (var prop in bindings) {
        var b = bindings[prop];
        if (b && b.id) bv[prop] = b.id;
        else if (Array.isArray(b)) bv[prop] = b.map(function(x) { return x.id; });
      }
    } catch(e) {}
    if (Object.keys(bv).length > 0) data.boundVariables = bv;
    // Fills
    if (node.fills && node.fills.length > 0) {
      data.fills = node.fills.map(function(f) {
        var fill = { type: f.type };
        if (f.color) fill.color = "#" +
          Math.round(f.color.r*255).toString(16).padStart(2,"0") +
          Math.round(f.color.g*255).toString(16).padStart(2,"0") +
          Math.round(f.color.b*255).toString(16).padStart(2,"0");
        return fill;
      });
    }
    // Component info
    if (node.type === "INSTANCE") {
      data.componentKey = node.mainComponent ? node.mainComponent.key : null;
      data.componentName = node.mainComponent ? node.mainComponent.name : null;
    }
    // Children
    if (node.children && node.children.length > 0) {
      data.children = [];
      for (var i = 0; i < node.children.length; i++) {
        var child = extractNode(node.children[i], depth + 1);
        if (child) data.children.push(child);
      }
    }
    return data;
  }

  return { tree: extractNode(root, 0) };
})();
```

---

## How Learnings Are Used

### During `spec` (Step 2.5)

Load `learnings.json`, filter by `screenType` matching the new spec's type. Display matching learnings as **"Known Preferences"** in the spec output.

### During `design` (Step 1e)

After pattern matching and before generation, load `learnings.json` and filter:
- **Global learnings:** Always apply
- **Contextual learnings:** Match by `screenType`, `component`, or `section`

List applicable learnings in the pre-script audit and integrate into generation scripts.

### During `done`

Persist any learnings from the current `learn` session. Clean up the snapshot file.

---

## File Location

```
knowledge-base/
  learnings.json          ← Persistent learning store
specs/active/
  {name}-snapshot.json    ← Temporary snapshot (deleted after done)
```
