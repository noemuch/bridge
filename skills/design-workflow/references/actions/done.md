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

### 4. Brief retro

- **What went well?** (patterns to repeat)
- **What was friction?** (improvements for the workflow)
- **What was learned?** (reusable knowledge)

### 5. Cleanup

Delete any remaining temp files if not already done.

---

## Output

```
## Done: {name}

Figma: {url}
Spec archived: specs/shipped/{name}-spec.md
```
