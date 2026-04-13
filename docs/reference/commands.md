# Commands

This file lists the main user-facing commands. Many additional prompts in `prompts/` are internal support steps used by chains.

## Planning

| Command | Purpose |
| --- | --- |
| `/ticket-flow-init` | Scaffold project guidance files |
| `/brainstorm <topic>` | Interactive brainstorming |
| `/architect` | Create or update `ARCHITECTURE.md` |
| `/plan <topic>` | Full planning pipeline |
| `/plan-chain <topic>` | Non-interactive planning chain |
| `/plan-create` | Create an ExecPlan |
| `/plan-improve` | Audit and improve an ExecPlan |
| `/ticketize` | Convert an ExecPlan into `tk` tickets |
| `/plan-and-build <topic>` | Plan, ticketize, and process the queue |
| `/refactor` / `/refactor-deep` | Plan a refactor |
| `/simplify` / `/simplify-deep` | Plan a simplification |

## Review, validation, and docs

| Command | Purpose |
| --- | --- |
| `/review` | Simple code review |
| `/review-deep` | Parallel multi-lens review with consolidation |
| `/review-fix` | Fix issues found in a review |
| `/review-fix-chain` | Review, then fix, until approved |
| `/test-fix` | Generic test-and-fix loop |
| `/document` | Generate or update documentation |

## Ticket execution

| Command | Purpose |
| --- | --- |
| `/ticket-flow` | Process exactly one ticket end to end |
| `/ticket-queue` | Process tickets sequentially |
| `/ticket-reset` | Reset stale orchestrator state |
| `/bridge-smoke` | Verify delegated prompt execution |

## Maintenance

| Command | Purpose |
| --- | --- |
| `/update-architecture` | Sync `ARCHITECTURE.md` after implementation |

## Advanced internal prompts

These exist in `prompts/` and are usually called by chain workflows rather than by hand:

- `ticket-pick`
- `ticket-implement`
- `ticket-test-fix`
- `ticket-review`
- `ticket-finalize`
- the internal `review-deep-*` passes

Deprecated compatibility shims:
- `ticket-mark-validation`
- `ticket-mark-review`
