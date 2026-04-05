---
description: Update ARCHITECTURE.md after ExecPlan implementation
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: update-architecture
restore: true
---

Synchronize ARCHITECTURE.md with changes made during ExecPlan implementation for: $@

Use `$@` as the primary topic selector. If `$@` is empty, auto-detect the most recent ExecPlan.

Procedure:

1. Determine the topic using topic resolution from the update-architecture skill.
2. If `$@` is not empty, derive `<topic-slug>` from `$@` using kebab-case, lowercase normalization.
3. Read the ExecPlan at `.ticket-flow/plans/<topic-slug>/execplan.md`. Focus on the Progress section and Decision Log.
4. Locate `ARCHITECTURE.md` at the repo root.
5. If it does not exist, create it following the architect skill template.
6. If it exists, update only affected sections following the update-architecture skill principles.
7. Update the `Last updated` date.

Follow the update-architecture skill exactly.

Report what was updated or created.
