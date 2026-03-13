# Action: drop

> Abandon the current work while preserving learnings.

---

## Procedure

### 1. Confirm

Ask: "Sure you want to drop {name}?"

### 2. Document learnings

Add to the spec:

```markdown
## Drop Notes
**Dropped**: {date}
**Reason**: {reason}
**Learnings**: {what was discovered, what blocked, what to do differently}
```

### 3. Archive

```bash
mv specs/active/{name}-spec.md specs/dropped/{name}-spec.md
```

### 4. Update history

```
{date} | {name} | DROPPED | {reason}
```

### 5. Cleanup

Delete temp files if any.
