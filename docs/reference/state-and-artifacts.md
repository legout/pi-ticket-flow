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
| `ticket-flow/invocation.md` | Per-invocation guard for the current chain run |
| `ticket-flow/current.md` | Current orchestrator state |
| `ticket-flow/<ticket-id>/implementation-<run-token>.md` | Implementation result |
| `ticket-flow/<ticket-id>/validation-<run-token>.md` | Validation result |
| `ticket-flow/<ticket-id>/review-<run-token>.md` | Review result |
| `ticket-flow/progress.md` | Queue progress |
| `ticket-flow/lessons-learned.md` | Queue learnings |

## `ticket-flow/invocation.md`

Required keys:

- `status:`
- `mode:`
- `ticket:`
- `run_token:`
- `reason:`

`ticket-pick` overwrites this at the start of each `/ticket-flow` or `/ticket-queue` invocation.
Downstream chain steps should proceed only when it says `status: armed` and the guarded `ticket:` / `run_token:` still match the selected attempt in `ticket-flow/current.md`.
`/ticket-reset` may also overwrite it with a blocked sentinel.

## `ticket-flow/current.md`

Required keys:

- `ticket:`
- `ticket_path:`
- `stage:`
- `implementation_artifact:`
- `validation_artifact:`
- `review_artifact:`

Optional tombstone key:

- `reason:`

Stage values used by the orchestrator:

- `waiting-worker`
- `waiting-validation`
- `waiting-review`
- `done`

Active runs use the six required keys above.
Queue-complete and manual-reset tombstones may also append `reason:` for human-readable context.

## Ownership rules

- `ticket-pick` arms `ticket-flow/invocation.md` for a fresh top-level run; `ticket-finalize` and `/ticket-reset` clear it back to a blocked sentinel
- the main-session orchestrator owns stage transitions in `ticket-flow/current.md`
- implementation, validation, and review each write their own artifact
- validation does **not** overwrite the implementation artifact
- review reads both implementation and validation artifacts before producing its result

## Queue completion

When the queue is empty, `ticket-pick` writes a tombstone `ticket-flow/current.md` record with:

- `ticket: none`
- `ticket_path: none`
- `stage: done`
- `implementation_artifact: none`
- `validation_artifact: none`
- `review_artifact: none`
- `reason: queue complete`
