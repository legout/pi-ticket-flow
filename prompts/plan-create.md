---
description: Create an ExecPlan from a brainstorm or user brief
model: openai-codex/gpt-5.4, zai/glm-5.1
thinking: high
skill: execplan-create
restore: true
---

Create a self-contained ExecPlan for: $@

Procedure:

1. Determine the topic using `$@` first, then topic resolution from the execplan-create skill.
2. If `$@` is not empty, derive `<topic-slug>` from `$@` using kebab-case, lowercase normalization.
3. Read `.ticket-flow/plans/<topic-slug>/brainstorm.md` if it exists for the brainstorm context.
4. Read `ARCHITECTURE.md` if it exists for architectural context.
5. Read `.ticket-flow/PLANS.md` in full for the ExecPlan format spec. If it is missing, stop and tell the user to run `/ticket-flow-init` first.
6. Inspect the repo to understand relevant files, flows, and current complexity.
7. Apply the Ousterhout lens when deciding the plan shape.
8. Prefer independently verifiable vertical milestones by default. Use explicit enabler, migration, prototype, or cleanup milestones only when justified by risk or sequencing.
9. Make milestone prerequisites, related non-blocking slices, parallelizable slices, and serialization/conflict points explicit in the plan prose.
10. Write the ExecPlan to `.ticket-flow/plans/<topic-slug>/execplan.md` following `.ticket-flow/PLANS.md` exactly.

Follow the execplan-create skill exactly for the authoring workflow and anti-patterns.

Report the file path and suggest running `/plan-improve $@` to audit the plan next.
