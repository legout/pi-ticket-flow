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
| `ticket-flow/invocation.json` | Per-invocation guard for the current chain run |
| `ticket-flow/current.json` | Current orchestrator state |
| `ticket-flow/<ticket-id>/implementation-<run-token>.md` | Implementation result |
| `ticket-flow/<ticket-id>/validation-<run-token>.md` | Validation result |
| `ticket-flow/<ticket-id>/review-<run-token>.md` | Review result |
| `ticket-flow/progress.md` | Queue progress |
| `ticket-flow/lessons-learned.md` | Queue learnings |

Important: these are **session artifacts**, not normal repository files.
Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
Do not create or inspect orchestrator state with repo-file tools (`read`, `write`, `edit`, shell redirection) against a checked-in `ticket-flow/` directory; that creates state the orchestrator will not see.

## `ticket-flow/invocation.json`

This is the per-invocation guard. Use this shape:

```json
{
  "version": 2,
  "status": "armed or blocked",
  "mode": "single or queue",
  "ticket": "flo-1234 or null",
  "run_token": "20260410T165200Z or null",
  "reason": "short explanation"
}
```

`ticket-pick` overwrites this at the start of each `/ticket-flow` or `/ticket-queue` invocation.
Downstream chain steps should proceed only when it says `status: "armed"` and the guarded `ticket` / `run_token` still match the selected attempt.
`/ticket-reset` and `ticket-finalize` overwrite it with a blocked sentinel when a run is over.

## `ticket-flow/current.json`

This is the current orchestrator state. Use this shape:

```json
{
  "version": 2,
  "ticket": "flo-1234 or null",
  "ticket_path": ".tickets/flo-1234.md or null",
  "stage": "waiting-worker | waiting-validation | waiting-review | done",
  "reason": "short explanation"
}
```

Unlike the old markdown state format, `current.json` does **not** duplicate artifact paths.
Implementation / validation / review artifact paths are derived deterministically from `ticket` + `run_token`.

## Artifact path derivation

Use the deterministic helper tool `ticket_flow_artifact_paths`.

It returns:

- `implementation`
- `validation`
- `review`

This reduces duplicated machine state and removes a common source of path-mismatch bugs.

## Ownership rules

- `ticket-pick` initializes `current.json` with `stage: "waiting-worker"` and arms `invocation.json`
- `ticket-test-fix` advances stage into `waiting-validation` and then `waiting-review` when appropriate
- `ticket-finalize` writes the `done` tombstone and blocks `invocation.json`
- implementation, validation, and review each write their own evidence artifact
- `progress.md` and `lessons-learned.md` are useful queue telemetry, but `invocation.json` and `current.json` are the operational source of truth

## Queue completion

When the queue is empty, `ticket-pick` writes:

### `ticket-flow/current.json`

```json
{
  "version": 2,
  "ticket": null,
  "ticket_path": null,
  "stage": "done",
  "reason": "queue complete"
}
```

### `ticket-flow/invocation.json`

```json
{
  "version": 2,
  "status": "blocked",
  "mode": "queue",
  "ticket": null,
  "run_token": null,
  "reason": "queue complete"
}
```
