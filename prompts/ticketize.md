---
description: Convert an ExecPlan into tk tickets with dependencies and ExecPlan references
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticketize
restore: true
---

Convert the ExecPlan for `$@` into tk tickets.

Use `$@` as the primary topic selector. If `$@` is empty, auto-detect from existing ExecPlans.

Procedure:

1. Determine the topic using topic resolution from the ticketize skill.
2. If `$@` is not empty, derive `<topic-slug>` from `$@` using kebab-case, lowercase normalization.
3. Read `.ticket-flow/plans/<topic-slug>/execplan.md` in full.
4. Parse all milestones from the Milestones section.
5. Apply the smart ticketization rules:
   - Default: one ticket per milestone
   - Merge small adjacent milestones (< 3 files each)
   - Split large milestones (> 8 files)
6. For each ticket, create it using `tk create` with:
   - Title from milestone name
   - Description with milestone prose, concrete steps, acceptance criteria
   - Priority based on milestone ordering
   - The ExecPlan Reference block
7. Set dependencies based on milestone ordering.
8. Report all created tickets.

Follow the ticketize skill exactly for the ExecPlan Reference block format and ticketization rules.

Report the number of tickets created and list each with ID, title, priority, and dependencies.
Suggest running `/ticket-flow` or `/ticket-queue` to start implementation.
