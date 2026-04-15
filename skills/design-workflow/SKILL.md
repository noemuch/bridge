---
name: design-workflow
version: 3.3.0
description: Compatibility shim — routes legacy /design-workflow invocations to the specialized skills that replaced it in v3.3.0. Prefer invoking the specialized skills directly.
---

# Design Workflow — Compatibility Shim (v3.3.0 → v4.0.0)

> As of v3.3.0, the monolithic `design-workflow` skill has been split
> into focused skills. This file exists only to keep legacy
> `/design-workflow <command>` invocations working and to redirect
> readers to the new locations. It will be removed in v4.0.0.

## Command → Skill routing

| Legacy command                     | New skill                                         |
| ---------------------------------- | ------------------------------------------------- |
| `/design-workflow make`            | `generating-figma-design`                         |
| `/design-workflow fix`             | `learning-from-corrections`                       |
| `/design-workflow done`            | `shipping-and-archiving`                          |
| `/design-workflow setup`           | `extracting-design-system`                        |
| `/design-workflow drop`            | `using-bridge` (inline drop procedure)            |
| `/design-workflow status`          | `using-bridge` (inline status logic)              |

The routing is enforced by the `using-bridge` skill's command map. This
shim just keeps the file alive so third-party integrations that hard-code
the path `.claude/skills/design-workflow/SKILL.md` do not break.
