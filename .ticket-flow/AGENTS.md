<!-- ticket-flow-generated -->
# pi-ticket-flow Workflow

Use this repository's ticket-flow workflow for planning and ticket execution.

Primary tracker selected during init: `tk`

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in `.ticket-flow/PLANS.md`) from design to implementation.

## Planning workflow

- Use `/ticket-flow-init [--tk|--br]` to scaffold planning files and initialize the chosen tracker.
- Use `/ticket-flow-setup-models` after editing `.ticket-flow/settings.yml` to sync `.pi/prompts/` frontmatter.
- Use `/brainstorm <topic>` to explore the problem before locking a design.
- Use `/plan <topic>` to go from brainstorming through ExecPlan creation.
- Use `/plan-chain <topic>` only when brainstorming is already complete and the remaining planning steps are non-interactive.
- Use `/architect [topic]` to create or refresh `ARCHITECTURE.md` when the codebase context matters.
- ExecPlans live at `.ticket-flow/plans/<topic-slug>/execplan.md`.
- Brainstorms live at `.ticket-flow/plans/<topic-slug>/brainstorm.md`.

## Tracker workflow

### tk mode

- Use `tk` for ticket tracking.
- Use `/create-work-items <topic>` to auto-select the primary tracker.
- Use `/create-tickets <topic>` to convert an ExecPlan into dependency-aware `tk` tickets.
- Use `/ticket-flow` for one-ticket delegated execution.
- Use `/ticket-queue` for sequential batch execution.
- Use `/ticket-reset` to clear stale orchestrator state.

### br mode

- Use `br` for issue tracking.
- Use `/create-work-items <topic>` to auto-select the primary tracker.
- Use `/create-issues <topic>` to convert an ExecPlan into dependency-aware `br` issues.
- Use `/ticket-execute-standard <issue-ref>` or the focused local `/ticket-*` prompts for manual implementation, validation, review, and finalization.
- The packaged delegated `/ticket-flow` and `/ticket-queue` workflow is `tk`-oriented and should not be treated as the primary `br` execution path.

## Artifact locations

### Planning artifacts

- `.ticket-flow/plans/<topic-slug>/brainstorm.md`
- `.ticket-flow/plans/<topic-slug>/execplan.md`
- `.ticket-flow/settings.yml`
- `ARCHITECTURE.md`

### Delegated runtime artifacts (`tk` delegated flow only)

- `ticket-flow/state.json`
- `ticket-flow/<ticket-id>/implementation-<run-token>.md`
- `ticket-flow/<ticket-id>/validation-<run-token>.md`
- `ticket-flow/<ticket-id>/review-<run-token>.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

## Work-item guidance

- If a ticket or issue contains an `ExecPlan Reference` block, read the referenced ExecPlan before implementing or reviewing.
- Keep ExecPlans and architecture documentation aligned with reality as work progresses.
<!-- /ticket-flow-generated -->
