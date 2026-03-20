# Action: done

> Archive the spec and close the work.

---

## Procedure

### 1. Final check

- [ ] Figma design exists and matches spec
- [ ] All acceptance criteria from spec are met
- [ ] User has validated the design

### 2. Archive

```bash
mv specs/active/{name}-spec.md specs/shipped/{name}-spec.md
```

### 3. Update history log

Append to `specs/history.log`:

```
{date} | {name} | {component|screen} | {figma_url} | {author}
```

### 4. Persist learnings

Check if `learn` was run during this cycle (i.e., `references/knowledge-base/learnings.json` was updated with entries referencing this spec):

- If yes: learnings are already persisted — confirm count:
  ```
  Learnings persisted: {n} learnings, {n} flags from this spec.
  ```
- If no learnings exist yet but a snapshot exists (`specs/active/{name}-snapshot.json`):
  ```
  💡 A snapshot exists but `learn` was never run.
     If you made manual corrections in Figma, run `learn` before `done` to capture them.
     Skip? (learnings will be lost)
  ```
  If user skips, proceed. If not, abort and let them run `learn` first.

### 5. Brief retro

- **What went well?** (patterns to repeat)
- **What was friction?** (improvements for the workflow)
- **What was learned?** (reusable knowledge)

### 6. Cleanup

- Delete snapshot file: `specs/active/{name}-snapshot.json` (if exists)
- Delete any remaining temp files

---

## Output

```
## Done: {name}

Figma: {url}
Spec archived: specs/shipped/{name}-spec.md
```
