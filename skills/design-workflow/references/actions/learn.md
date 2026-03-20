# Action: learn

> Diff the generated design against the current Figma state, extract user corrections, and persist learnings.

---

## Prerequisites

- Active spec in `specs/active/` (abort if missing: "No active spec. Run: `spec {name}`")
- Snapshot file exists at `specs/active/{name}-snapshot.json` (abort if missing: "No snapshot found. The design must have been generated with the latest workflow. Re-run: `design`")
- figma-console-mcp available (check with `figma_get_status`)

---

## Procedure

### 1. Load artifacts

- Read the active spec from `specs/active/{name}-spec.md`
- Read the snapshot from `specs/active/{name}-snapshot.json`
- Read existing learnings from `references/knowledge-base/learnings.json` (create empty structure if file doesn't exist)
- Load `references/knowledge-base/registries/variables.json` → for token resolution

### 2. Re-extract current state

Run the same node tree extraction script used for snapshots (see `schemas/learnings.md`) via `figma_execute`, using the `rootNodeId` and `fileKey` from the snapshot's `meta`.

```
figma_execute({ code: "...extraction script with ROOT_NODE_ID from snapshot meta..." })
```

### 3. Diff snapshot vs current state

Compare the two JSON trees in context. Claude performs this comparison directly — no custom diff code needed.

**Match strategy:**
- Match nodes by `id` (stable across edits)
- For each matched node, compare: `layoutMode`, `itemSpacing`, `paddingTop/Bottom/Left/Right`, `cornerRadius`, `fills`, `boundVariables`, `width`, `height`, `componentKey`
- Detect **added nodes** (present in current, absent in snapshot)
- Detect **removed nodes** (present in snapshot, absent in current)
- Detect **property changes** (same node, different values)

**Ignore:**
- Pure name changes (layer renaming)
- Position changes (x, y) unless they indicate a structural move

### 4. Classify changes

For each detected change:

```
Does the new value use a DS token (bound variable)?
  → YES: Classify as LEARNING
  → NO (hardcoded hex, raw px value, unbound): Classify as FLAG
```

**Token resolution:** Check `boundVariables` in the current tree. If the property has a bound variable ID, resolve it against `registries/variables.json` to get the token name.

### 5. Extract learnings

For each LEARNING-classified change:

1. **Determine context:**
   - `screenType`: from the spec's description or visual reference section
   - `component`: nearest component ancestor name, or the node's own name if it's a component instance
   - `section`: parent frame name (e.g., "header", "content", "sidebar")

2. **Check for existing learning:** Search `learnings.json` for a learning with matching `context` + `change.property` + `change.to.token`
   - If found: increment `signals`, append to `history`
   - If not found: create new learning entry

3. **Generate rule:** Write a human-readable rule describing the preference (e.g., "For settings screens, cards use spacing/medium (not large)")

4. **Check promotion:** After updating signals, check if any contextual learning qualifies for global promotion:
   - `signals >= 3`
   - Observations from ≥ 2 different `screenType` values
   - No contradiction (same property pointing to different tokens in different learnings)

### 6. Extract flags

For each FLAG-classified change:

1. Create a flag entry with the spec name, node description, and what was hardcoded
2. Add to `flags` array in `learnings.json`

### 7. Update spec

If learnings were extracted (DS-compliant changes):
- Update the active spec's token references to match the corrected values
- This ensures the spec in `specs/shipped/` (after `done`) reflects the final design

### 8. Save learnings

Write updated `learnings.json` to `references/knowledge-base/learnings.json`.

Update `meta.lastUpdated` to today's date.

### 9. Report

```markdown
## Learn: {name}

### Changes detected: {total count}

### Learnings extracted: {count}
| # | Context | Property | From | To | Rule |
|---|---------|----------|------|----|------|
| 1 | settings / card | itemSpacing | spacing/large (24) | spacing/medium (16) | Cards in settings use medium spacing |

### Flags: {count}
| # | Node | Issue |
|---|------|-------|
| 1 | StatusBadge | Hardcoded hex #FF5722 — no DS token bound |

### Promotions: {count}
- "{rule}" promoted to global (signals: {n}, screenTypes: {list})

### Spec updated: {yes/no}
{list of spec changes if any}

Next: Continue editing in Figma and run `learn` again, or run: `done`
```

---

## Output

```
Learn complete for {name}.

Learnings: {n} extracted ({n} new, {n} reinforced, {n} promoted)
Flags: {n} hardcoded values flagged
Spec: {updated/unchanged}

Learnings saved to knowledge-base/learnings.json
Next: `done` to archive, or continue editing and `learn` again.
```

---

## Transition

- If user wants to continue editing → they can run `learn` again after more changes
- When satisfied → suggest: "Run: `done`"
