# Action: sync

> Incrementally sync the DS knowledge base with the current state of the Figma DS library.

---

## Prerequisites

- Knowledge base exists (`references/knowledge-base/registries/` has JSON files) — abort if missing: "No knowledge base found. Run: `setup` first."
- figma-console-mcp available (check with `figma_get_status`)

---

## Procedure

### 1. Read current registries

Load all existing registries:
- `registries/components.json`
- `registries/variables.json`
- `registries/text-styles.json`
- `registries/icons.json` (if exists)
- `registries/logos.json` (if exists)
- `registries/illustrations.json` (if exists)

Note the `meta.fileKey` from any registry to identify the DS source file.

### 2. Re-extract from Figma

Use the same MCP tools as `setup`:
- `figma_get_design_system_kit({ file_key })` → full DS snapshot
- `figma_get_variables({ file_key })` → current variables
- `figma_get_styles({ file_key })` → current text/color/effect styles

If `figma_get_design_system_kit` doesn't return component keys, supplement with `figma_execute` extraction scripts (same as in `schemas/components.md`).

### 3. Diff registries

Compare old vs new for each registry:

**Components (`components.json`):**
- **Added:** components in new extraction not in current registry
- **Removed:** components in current registry not in new extraction (match by `key`)
- **Modified:** same `key` but different `properties`, `name`, or `variants` count

**Variables (`variables.json`):**
- **Added:** new variable keys
- **Removed:** variable keys no longer present
- **Modified:** same `key` but different `name`, `valuesByMode`, or collection assignment

**Text styles (`text-styles.json`):**
- **Added:** new style keys
- **Removed:** style keys no longer present
- **Modified:** same `key` but different `name` or font properties

**Assets (icons/logos/illustrations):**
- Same add/remove/modify logic by `key`

### 4. Impact analysis

For removed or modified items, check references across the knowledge base:

**Guides impact:**
- Search `guides/components/*.md` for references to removed/renamed components
- Search `guides/tokens/*.md` for references to removed/renamed variables
- Search `guides/patterns/*.md` for affected patterns

**Learnings impact:**
- Check `learnings.json` for learnings referencing removed tokens
- Flag affected learnings (don't delete — mark for user review)

**Active specs impact:**
- Check `specs/active/*.md` for references to removed/modified components or tokens

### 5. Report to user

Present the diff report BEFORE applying changes:

```markdown
## DS Sync Report

### Summary
- Components: +{added} ~{modified} -{removed}
- Variables: +{added} ~{modified} -{removed}
- Text styles: +{added} ~{modified} -{removed}
- Assets: +{added} ~{modified} -{removed}

### Added
{list of new items per registry}

### Modified
{list of changed items with old → new values}

### Removed (⚠️ Breaking Changes)
{list of removed items}

#### Impact of removals:
- Guides affected: {list of guide files referencing removed items}
- Learnings affected: {list of learning IDs referencing removed tokens}
- Active specs affected: {list of spec files referencing removed items}

### Recommended actions:
1. {action per breaking change}
```

**BLOCKING:** If there are removals (breaking changes), ask the user to confirm before proceeding:
```
{n} items were removed from the DS. This affects {n} guides and {n} learnings.
Proceed with sync? (Removed items will be deleted from registries, affected guides will be patched.)
```

### 6. Apply updates

After user confirmation:

**Update registries:**
- Add new entries
- Update modified entries (preserve `key`, update other fields)
- Remove deleted entries

**Patch guides:**
- For removed components: remove or comment out references in affected guide files
- For renamed components: find-and-replace old name with new name
- For modified properties: update property descriptions in component guides

**Update learnings:**
- For learnings referencing removed tokens: add a flag entry noting the token was removed
- Do NOT delete learnings — they may still be conceptually valid even if the token name changed

**Re-validate registries:**
- Run sample import test (3-5 keys per registry) via `figma_execute` to confirm new/modified keys work
- Follow `schemas/validation.md` procedure

### 7. Regenerate affected guides (optional)

If significant changes detected (>10 items changed or any category restructured), suggest:
```
Significant DS changes detected. Regenerate affected guides?
- Token guides: {list if token changes}
- Component guides: {list if component changes}
```

Only regenerate if user confirms. Use the same guide generation logic as `setup`.

---

## Output

```
DS Sync complete.

Updated:
  - components.json: +{n} ~{n} -{n}
  - variables.json: +{n} ~{n} -{n}
  - text-styles.json: +{n} ~{n} -{n}
  - {assets}: +{n} ~{n} -{n}

Guides patched: {n} files
Learnings preserved: {n} ({n} flagged for review)
Validation: {PASS/FAIL}

Next: Review updated registries, then continue with `spec` or `design`.
```

---

## Transition

After sync → suggest: "DS synced. Run: `status` to see current state."
