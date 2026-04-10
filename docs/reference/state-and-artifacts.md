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
  "ticket_path": ".tickets/flo-1234.md or null",
  "run_token": "20260410T165200Z or null",
  "reason": "short explanation"
}
```

`ticket-pick` overwrites this at the start of each `/ticket-flow` or `/ticket-queue` invocation.
Main-session steps should proceed only when it says `status: "armed"` and the guarded `ticket` / `run_token` still match the selected attempt.
`/ticket-reset` and `ticket-finalize` overwrite it with a blocked sentinel when a run is over.

## `ticket-flow/current.json`

This is the current orchestrator state. Use this shape:

```json
{
  "version": 2,
  "stage": "active | done",
  "reason": "short explanation"
}
```

`current.json` is now only a lightweight main-session marker for whether the orchestrator is still active or done.
Ticket identity and ticket file location live in `invocation.json`, while implementation / validation / review artifact paths are derived deterministically from `ticket` + `run_token`.
Fresh delegated worker / reviewer steps do not need to read `current.json`; they consume the compact handoff emitted by `ticket-pick`.
Older sessions may still contain `waiting-worker`, `waiting-validation`, or `waiting-review`; treat those as legacy non-`done` active runs that should be reset or finalized, not as new states to write going forward.

## Delegated handoff summary

When `ticket-pick` selects a ticket, its final assistant message must start with:

`Selection handoff JSON: {"ticket":"flo-1234","ticket_path":".tickets/flo-1234.md","mode":"single","run_token":"20260410T165200Z"}`

Fresh delegated steps (`ticket-implement`, `ticket-test-fix`, `ticket-review`, and the internal `ticket-review-deep-*` passes) parse that summary from chain context, derive deterministic artifact paths from `ticket` + `run_token`, and avoid reading shared `ticket-flow/invocation.json` / `ticket-flow/current.json`.

## Artifact path derivation

Use the deterministic helper tool `ticket_flow_artifact_paths`.

It returns:

- `implementation`
- `validation`
- `review`

This reduces duplicated machine state and removes a common source of path-mismatch bugs.

## Ownership rules

- `ticket-pick` initializes `current.json` with `stage: "active"`, arms `invocation.json`, and emits the delegated handoff summary
- `ticket-implement`, `ticket-test-fix`, and `ticket-review` consume that handoff and write only their own evidence artifacts
- delegated steps do **not** mutate `ticket-flow/current.json` or `ticket-flow/invocation.json`
- `ticket-finalize` writes the `done` tombstone and blocks `invocation.json`
- `progress.md` and `lessons-learned.md` are useful queue telemetry, but main-session JSON state plus deterministic per-run artifacts are the durable workflow contract

## Queue completion

When the queue is empty, `ticket-pick` writes:

### `ticket-flow/current.json`

```json
{
  "version": 2,
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
  "ticket_path": null,
  "run_token": null,
  "reason": "queue complete"
}
```
