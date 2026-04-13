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
| `ticket-flow/state.json` | Orchestrator state (per-invocation guard + stage) |
| `ticket-flow/<ticket-id>/implementation-<run-token>.md` | Implementation result |
| `ticket-flow/<ticket-id>/validation-<run-token>.md` | Validation result |
| `ticket-flow/<ticket-id>/review-<run-token>.md` | Review result |
| `ticket-flow/progress.md` | Queue progress |
| `ticket-flow/lessons-learned.md` | Queue learnings |

Important: these are **session artifacts**, not normal repository files.
Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
Do not create or inspect orchestrator state with repo-file tools (`read`, `write`, `edit`, shell redirection) against a checked-in `ticket-flow/` directory; that creates state the orchestrator will not see.

## `ticket-flow/state.json`

This is the orchestrator state. Use this shape:

```json
{
  "version": 3,
  "ticket": "flo-1234 or null",
  "ticket_path": ".tickets/flo-1234.md or null",
  "run_token": "20260410T165200Z or null",
  "mode": "single or queue",
  "stage": "selecting | implementing | validating | reviewing | done",
  "reason": "short explanation"
}
```

`ticket-pick` overwrites this at the start of each `/ticket-flow` or `/ticket-queue` invocation, and again with the armed state after selecting a ticket.
Main-session steps should proceed only when `stage` is not `done` and the guarded `ticket` / `run_token` still match the selected attempt.
`/ticket-reset` and `ticket-finalize` overwrite it with a `done` tombstone when a run is over.

## Delegated handoff artifact

When `ticket-pick` selects a ticket, it writes `ticket-flow/handoff.json`:

```json
{
  "ticket": "flo-1234",
  "ticket_path": ".tickets/flo-1234.md",
  "mode": "single",
  "run_token": "20260410T165200Z"
}
```

Fresh delegated steps (`ticket-implement`, `ticket-test-fix`, `ticket-review`) read this artifact via `read_artifact`, derive deterministic artifact paths from `ticket` + `run_token`, and avoid reading shared `ticket-flow/state.json`.

## Artifact path derivation

Use the deterministic helper tool `ticket_flow_artifact_paths`.

It returns:

- `implementation`
- `validation`
- `review`

This reduces duplicated machine state and removes a common source of path-mismatch bugs.

## Ownership rules

- `ticket-pick` writes `state.json` with `stage: "implementing"` and emits the delegated handoff summary
- `ticket-implement`, `ticket-test-fix`, and `ticket-review` consume that handoff and write only their own evidence artifacts
- delegated steps do **not** mutate `ticket-flow/state.json`
- `ticket-finalize` writes `state.json` with `stage: "done"`
- `progress.md` and `lessons-learned.md` are useful queue telemetry, but main-session JSON state plus deterministic per-run artifacts are the durable workflow contract

## Queue completion

When the queue is empty, `ticket-pick` writes:

### `ticket-flow/state.json`

```json
{
  "version": 3,
  "ticket": null,
  "ticket_path": null,
  "run_token": null,
  "mode": "queue",
  "stage": "done",
  "reason": "queue complete"
}
```
