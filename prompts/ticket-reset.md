---
description: Reset stale ticket-flow orchestrator state for the current session
model: minimax/MiniMax-M2.7, zai/glm-5-turbo
thinking: minimal
skill: ticket-flow
restore: true
---

Reset stale ticket-flow orchestrator state for the current session.

Rules:
- This command only resets orchestrator state.
- It must **not** close tickets.
- It must **not** reopen tickets.
- It must **not** discard code changes.
- It must **not** delete ticket notes.

Procedure:

1. Try `read_artifact(name: "ticket-flow/current.json")`.
2. Try `read_artifact(name: "ticket-flow/invocation.json")`.
3. Also try `read_artifact(name: "ticket-flow/current.md")` and `read_artifact(name: "ticket-flow/invocation.md")` only as a legacy cleanup check.
4. If all four artifacts are missing, report that there is nothing to reset and stop.
5. If `ticket-flow/current.json` exists, briefly summarize its `stage`.
6. If `ticket-flow/invocation.json` exists, briefly summarize its `status`, `mode`, and `ticket`.
7. If legacy markdown state exists, mention that legacy state was also found and will be cleared.
8. Overwrite `ticket-flow/current.json` with:

```json
{
  "version": 2,
  "stage": "done",
  "reason": "manual reset via /ticket-reset"
}
```

9. Overwrite `ticket-flow/invocation.json` with:

```json
{
  "version": 2,
  "status": "blocked",
  "mode": "single",
  "ticket": null,
  "ticket_path": null,
  "run_token": null,
  "reason": "manual reset via /ticket-reset"
}
```

10. If legacy markdown state exists, overwrite it with these safe tombstones so old sessions cannot confuse future runs.

Legacy `ticket-flow/current.md`:

```md
ticket: reset
ticket_path: none
stage: done
implementation_artifact: none
validation_artifact: none
review_artifact: none
reason: manual reset via /ticket-reset
```

Legacy `ticket-flow/invocation.md`:

```md
status: blocked
mode: single
ticket: none
run_token: none
reason: manual reset via /ticket-reset
```
11. Report that orchestrator state was reset successfully.
