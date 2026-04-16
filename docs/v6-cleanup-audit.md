# Bridge v6 Cleanup — Audit & Decisions

**Date locked:** 2026-04-16
**Branch:** `v6-cleanup`
**Status:** Phase 1 — awaiting user validation gate

---

## Positioning anchor (locked Phase 0)

Bridge is a **deterministic compiler** that turns AI-generated design intent into Figma output **guaranteed DS-compliant by construction, not by verification**.

**3 pillars** (every subsystem must serve one or die):
1. **Compiler-enforced correctness** — 26 Figma API rules + DS token compliance
2. **Conversational UX via Claude Code skills** — `make` / `fix` / `done`
3. **Living KB synchronized with Figma** — registries refreshed via cron

**Principle:** subtraction by default. The Bridge codebase should be smaller in 6 months, not larger.

---

## Scoring rubric

```
Score = Coupling×3 + Usage×2 − MaintCost×2 + Reversibility×1
```

| Dimension      | Scale                                    |
|----------------|------------------------------------------|
| **Coupling**   | 1 (orthogonal to pillars) → 5 (essential) |
| **Usage**      | 1 (shelf-ware) → 5 (every session)       |
| **MaintCost**  | 1 (negligible) → 5 (heavy burden)        |
| **Reversibility** | 1 (irreversible) → 5 (trivial cut)    |

| Score    | Decision           |
|----------|--------------------|
| ≥ 12     | **Keep & harden**  |
| 6 – 11   | **Simplify or freeze** |
| < 6      | **Cut**            |

---

## Subsystem inventory & scoring

### A. Compiler — `lib/compiler/`

| Module | LOC | Note |
|---|---|---|
| codegen.ts | 910 | 26-rule emit logic |
| resolve.ts | 716 | Token + node walking |
| schema.ts | 716 | Validation + shorthand expansion |
| compile.ts | 277 | Pipeline orchestrator |
| registry.ts | 266 | KB loader |
| validate.ts | 248 | Rules 3, 14, 18, 25 |
| plan.ts | 194 | Chunk planner (12KB limit) |
| errors.ts | 188 | 25 error codes + Levenshtein suggest |
| types.ts | 180 | Shared interfaces |
| cli.ts | 163 | CLI wrapper |
| wrap.ts | 97 | Transport wrappers |
| helpers.ts | 61 | Runtime helper block |
| **TOTAL** | **4,251** | + 235 LOC tests (5 tests, ~25 lines logic) |

**Score:** Coupling 5, Usage 5, MaintCost 3, Reversibility 1 → **20** → **KEEP & HARDEN**

**Action items:**
- Expand test coverage (currently anemic — 5 tests, no codegen output validation, no rule-violation coverage). Target: 30+ tests covering all 26 rules.
- Optional refactor (defer to v6.1): split `resolve.ts` into `resolveToken.ts` + `walkNodes.ts`; collapse redundant codegen emit helpers (potential −500 LOC, no functional loss).

---

### B. KB infrastructure — `lib/kb/`

| Module | LOC | Feeds | Score | Decision |
|---|---|---|---|---|
| **registry-io.ts** | 88 | compiler + extractor | 18 | **KEEP** (essential I/O layer) |
| **schema-version.ts** | 76 + 155 tests | compiler guard + migrate cmd | **8** | **SIMPLIFY** (collapse to single check function; drop `KBSchemaError` class + version constant; archive permanent versioning infra) |
| **index-builder.ts** | 164 | docs only | **4** | **CUT** (leaves with docs) |
| **hash.ts** | 15 | docs (sha256 for state diff) | 11 | **KEEP** (cheap utility, may be reused by upgraded cron) |
| **auto-detect.ts** | 71 | CLI setup-orchestrator | 12 | **KEEP** (essential for setup UX) |
| **migrations/legacy-to-v1.ts** | 72 + 99 tests | `bridge-ds migrate` | 7 | **FREEZE** (one-time use; keep `migrate` cmd as insurance for v4→v5 migrants but stop expanding the framework) |

**Total LOC delta for KB infra:** −150 (schema-version simplification) − 164 (index-builder) − 99 (migration test trim) = **~−400 LOC**

---

### C. Docs subsystem — `lib/docs/` ★ THE BIG CUT

| Group | Files | LOC |
|---|---|---|
| Top-level (generate, state, linter, mcp-server, preservation) | 5 | 559 |
| `cascade/` (diff-engine, impact-analyzer, regen-planner, rename-detector) | 4 | 241 |
| `generators/` (component, foundation, pattern, changelog, migration, llms-txt) | 6 | 254 |
| `templates/` (renderer + helpers) | 2 | 125 |
| Handlebars `.hbs` template assets | 7 | 264 |
| Tests | 17 | 880 |
| **TOTAL** | **42** | **2,323 LOC** |

**Score:** Coupling 1 (promise unfulfilled — `generate.ts:115` passes `docs:{}` for every component), Usage 1 (produces empty boilerplate), MaintCost 4, Reversibility 5 (clean cut, only −41 LOC blast radius outside `lib/docs/`) → **2** → **CUT**

**Blast radius outside `lib/docs/`** (changes required to compile after removal):
- `lib/cli/main.ts` — remove `case "docs"` branches (−26 LOC)
- `lib/cron/orchestrator.ts` — remove `sync` import + call (−10 LOC; replaced by KB-diff logic in Phase 4)
- `lib/cli/doctor.ts` — remove `readState` import + docs health checks (~−5 LOC)

**Total reduction:** 2,323 + 41 = **~2,364 LOC removed**

---

### D. Cron + setup + extract

| Module | LOC | Score | Decision |
|---|---|---|---|
| **lib/cron/orchestrator.ts** | 87 | **24** (post-decoupling) | **KEEP & UPGRADE** (Phase 4: drop `sync()` call; add KB diff → `kb-diff.md` PR body; add recipe + CSpec ref-validity check) |
| **lib/cli/extract.ts** | 39 | 25 | **KEEP & HARDEN** (already stamps `version: 1` correctly per Agent 5) |
| **lib/cli/setup-orchestrator.ts** | 174 | 19 | **KEEP & FIX** (Phase 4: fix #15 cron workflow YAML to use `npx -y @noemuch/bridge-ds@<VERSION>`; prune docs scaffolding lines once docs cut) |

**Phase 4 cron-upgrade scope:** ~30 LOC orchestrator change + ~30 LOC setup scaffold change + new diff helper (~80 LOC).

---

### E. CLI surface — `lib/cli/`

| Command | LOC | Decision | Notes |
|---|---|---|---|
| `setup` (orchestrator) | 25 dispatch + 174 impl | **KEEP** | Critical bootstrap path |
| `compile` | 1 dispatch + cli.ts (163) | **KEEP & HARDEN** | Tests are smoke-only |
| `cron` | 2 dispatch + 87 impl | **KEEP & UPGRADE** | See D above |
| `extract --headless` | 39 | **KEEP** | Niche but justified |
| `doctor` | 55 | **SIMPLIFY** | Drop docs health checks (Phase 3 cleanup) |
| `migrate` | 65 | **KEEP** | Insurance for v4→v5 migrants |
| `docs build/sync/check/mcp` | 4 dispatch | **CUT** | Leaves with docs subsystem |
| `init-docs` | 133 | **CUT** | Soft-deprecated, duplicate of `setup` |
| `init` (deprecation stub) | 4 | **CUT** | v5.0 stub, no longer needed |
| `update` (deprecation stub) | 3 | **CUT** | v5.0 stub, no longer needed |

**CLI delta:** −140 LOC (init-docs + stubs) + simplification on doctor (~−20)

---

### F. Skills — `skills/`

| Skill | Decision | Notes |
|---|---|---|
| `using-bridge` | **KEEP** | Force-loaded, ~500 tokens |
| `generating-figma-design` | **KEEP** | `make` flow |
| `learning-from-corrections` | **KEEP** | `fix` flow |
| `shipping-and-archiving` | **KEEP & EDIT** | Remove "cascade docs" step (was step 10 invoking generating-ds-docs) |
| `extracting-design-system` | **KEEP & EDIT** | Remove "initial docs build" step from setup procedure |
| `generating-ds-docs` | **CUT** | 3.1 KB skill + references — leaves with docs subsystem |

**Skill descriptions:** all 6 confirmed sharp ("Use when X — does Y" pattern, per Agent 6 audit). Memory `project_skill_descriptions_ux.md` was outdated and has been removed.

---

### G. Plugin distribution + meta

| Item | Decision | Notes |
|---|---|---|
| `.claude-plugin/plugin.json` + `marketplace.json` | **KEEP** | Active, in sync |
| `.cursor-plugin/plugin.json` | **KEEP & COMPLETE** | Add missing `marketplace.json` (Agent 6 finding) |
| `.mcp.json` | **KEEP** | MCP config |
| `hooks/session-start` | **KEEP** | Minimal, well-scoped |
| `references/compiler-reference.md` | **KEEP & EDIT** | Drop docs-related sections if any |
| `references/transport-adapter.md` | **KEEP** | Pillar 1+2 |
| `references/verification-gates.md` | **KEEP** | Pillar 2 |
| `references/red-flags-catalog.md` | **KEEP** | Pillar 1 |
| `scripts/bump-version.js` | **KEEP** | Release tooling |
| `scripts/validate-skills.js` | **KEEP & UPDATE** | Will catch missing `generating-ds-docs` after cut — update test |
| `.github/workflows/ci.yml` | **KEEP & TRIM** | Drop docs-specific jobs |
| `.github/workflows/release.yml` | **KEEP** | Release automation |

---

### H. Tests

| Test bucket | Decision | LOC delta |
|---|---|---|
| Compiler tests (235 LOC) | **EXPAND** | +500 LOC target (cover 26 rules, codegen output) |
| Docs tests (880 LOC) | **CUT** | −880 LOC |
| KB tests (~250 LOC) | **TRIM** | −150 LOC (with schema-version simplification) |
| CLI tests (~200 LOC) | **TRIM** | −80 LOC (init-docs, init, update tests removed) |

---

## Summary table

| Category | Verdict | LOC Δ |
|---|---|---|
| Compiler core | Keep & harden (test expansion) | +500 (tests); −500 optional refactor |
| KB infrastructure | Mostly keep; simplify schema-version | **−400** |
| **Docs subsystem (entire)** | **CUT** | **−2,364** |
| Cron orchestrator | Keep & upgrade (KB-freshness pivot) | +80 net (new diff helper) |
| Setup orchestrator | Keep & fix (#15) | ~0 |
| Extract | Keep | 0 |
| CLI dispatcher | Keep, prune dead commands | **−160** |
| Doctor | Simplify | **−20** |
| Migrate | Keep (insurance) | 0 |
| `generating-ds-docs` skill | CUT | −3 KB |
| `.cursor-plugin` | Complete (add marketplace.json) | +50 lines |
| README | Rewrite (drop docs section) | restructure |
| CHANGELOG / BREAKING.md | Add v6.0.0 entry | +new |

**Net code reduction:** ~**−2,944 LOC removed**, +500 tests added, +80 LOC cron upgrade.
**Surface complexity reduction:**
- Skills: **6 → 5**
- CLI commands (active): **13 → 8**
- Distinct subsystems: **~10 → ~6**

---

## Outstanding decisions for user gate

Before Phase 2 (writing-plans), please validate the following — line by line, override anything you disagree with:

### Confirm CUT decisions
1. ☐ **Cut entire `lib/docs/` subsystem** (2,323 LOC + 880 test LOC + 264 template LOC)
2. ☐ **Cut `generating-ds-docs` skill** + its references
3. ☐ **Cut `lib/kb/index-builder.ts`** (docs-only consumer)
4. ☐ **Cut `init-docs` CLI command** (133 LOC, deprecated, duplicates `setup`)
5. ☐ **Cut `init` + `update` deprecation stubs** (residue from v5.0)

### Confirm SIMPLIFY decisions
6. ☐ **Simplify `lib/kb/schema-version.ts`** to a single check function — drop `KBSchemaError` class, version constant, the whole "permanent infra" framing
7. ☐ **Simplify `lib/cli/doctor.ts`** to drop docs health checks
8. ☐ **Freeze migration framework** (keep `migrate` cmd, stop expanding the migrations/ folder)

### Confirm KEEP & UPGRADE decisions
9. ☐ **Keep cron, decouple from docs**, add KB-diff PR body + recipe/CSpec ref-validity checking
10. ☐ **Fix #15** as part of Phase 4 (workflow YAML → `npx`)
11. ☐ **Expand compiler tests** to cover 26 rules + codegen output

### Confirm EDIT decisions
12. ☐ **Edit `shipping-and-archiving` skill** — remove docs-cascade step
13. ☐ **Edit `extracting-design-system` skill** — remove initial-docs-build step
14. ☐ **Add `marketplace.json` to `.cursor-plugin/`**

### Open questions you may want to answer
Q1. **Cursor plugin** — keep it alive in v6 or freeze (you mentioned mostly using Claude Code)?
Q2. **Recipe + learning JSON files** — these are read by the `make` skill at runtime (not by `lib/kb/index-builder` which we're cutting). Confirmed retain. OK?
Q3. **MCP docs server (`bridge-ds docs mcp`)** — Agent 4 noted this is orthogonal to docs generation; technically could survive without the rest of docs/. But it serves docs that won't exist post-cut, so cutting it is consistent. Confirm cut?
Q4. **CHANGELOG / BREAKING.md style** — do you want a long migration guide for v5→v6 users, or terse "we cut docs because they were a lie" framing?

### Optional follow-ups (defer to v6.1+ if not urgent)
- Compiler refactor (split `resolve.ts`, collapse codegen emit helpers): potential −500 LOC, zero functional change
- Test coverage expansion beyond compiler (currently overall thin)

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Existing v5 users have docs in their repos and will break on upgrade | BREAKING.md with explicit migration: "delete docs/ tree; the `docs build` command no longer exists; use Storybook/ZeroHeight for hosted docs" |
| Cron-upgrade scope creep | Define exact contract upfront (Phase 2 plan): KB diff → PR body → done. No new features. |
| Breaking the `make` skill flow if recipes file format relies on `index-builder` | Verify in Phase 3 task 1: confirm `make` reads recipes JSON directly, not via `lib/kb/index-builder` |
| Compiler tests expansion turns into rabbit hole | Cap Phase 4 test work at ~500 LOC; defer further coverage to v6.1 |

---

## Phase 1 → Phase 2 handoff conditions

Phase 2 (writing-plans) starts when:
- ☐ User has reviewed every decision above and either confirmed (☑) or overridden each
- ☐ Open questions Q1–Q4 answered
- ☐ Audit doc committed to `v6-cleanup` branch

Phase 2 deliverable: `docs/superpowers/plans/2026-04-16-v6-cleanup.md` (subagent-driven execution plan).
