# State files and artifacts

## Repo-tracked planning files

These are meant to be committed:

| Path | Purpose |
| --- | --- |
| `.ticket-flow/plans/<topic>/brainstorm.md` | Brainstorm output |
| `.ticket-flow/plans/<topic>/execplan.md` | Living execution plan |
| `.ticket-flow/AGENTS.md` | Project workflow guidance |
| `.ticket-flow/PLANS.md` | ExecPlan authoring spec |
| `ARCHITECTURE.md` | Project architecture description |

## Session artifacts

These are workflow handoff files created during execution:

| Path | Purpose |
| --- | --- |
| `ticket-flow/current.md` | Current orchestrator state |
| `ticket-flow/<ticket-id>/implementation-<run-token>.md` | Implementation result |
| `ticket-flow/<ticket-id>/validation-<run-token>.md` | Validation result |
| `ticket-flow/<ticket-id>/review-<run-token>.md` | Review result |
| `ticket-flow/progress.md` | Queue progress |
| `ticket-flow/lessons-learned.md` | Queue learnings |

## `ticket-flow/current.md`

Required keys:

- `ticket:`
- `ticket_path:`
- `stage:`
- `implementation_artifact:`
- `validation_artifact:`
- `review_artifact:`

Stage values used by the orchestrator:

- `waiting-worker`
- `waiting-validation`
- `waiting-review`
- `done`

## Ownership rules

- the main-session orchestrator owns stage transitions in `ticket-flow/current.md`
- implementation, validation, and review each write their own artifact
- validation does **not** overwrite the implementation artifact
- review reads both implementation and validation artifacts before producing its result

## Queue completion

When the queue is empty, `ticket-pick` writes a tombstone `ticket-flow/current.md` record with:

- `ticket: none`
- `ticket_path: none`
- `stage: done`
- `reason: queue complete`
