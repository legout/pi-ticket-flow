---
description: Create or update ARCHITECTURE.md for the project
model: zai/glm-5.1, kimi-coding/k2p5
thinking: high
skill: architect
restore: true
---

Create or update the project's ARCHITECTURE.md.

Topic context: $@

Procedure:

1. If `$@` is not empty, derive `<topic-slug>` from `$@` using kebab-case, lowercase normalization.
2. Check if `ARCHITECTURE.md` exists at the project root.
3. If `$@` is not empty, read `.ticket-flow/plans/<topic-slug>/brainstorm.md` for context if it exists.
4. If `$@` is empty, scan `.ticket-flow/plans/` for the most recent brainstorm for optional context.
5. Follow the architect skill exactly.

If `ARCHITECTURE.md` does not exist, create it following the skill's output format.
If it exists, update only the affected sections while preserving existing content.

Report the file path when done.
