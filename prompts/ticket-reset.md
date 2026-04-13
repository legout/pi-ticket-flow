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

1. Try `read_artifact(name: "ticket-flow/state.json")`.
2. Try `read_artifact(name: "ticket-flow/current.json")` as a dual-state legacy check.
3. Try `read_artifact(name: "ticket-flow/invocation.json")` as a dual-state legacy check.
4. Also try `read_artifact(name: "ticket-flow/current.md")` and `read_artifact(name: "ticket-flow/invocation.md")` only as a legacy cleanup check.
5. If all artifacts are missing, report that there is nothing to reset and stop.
6. If `ticket-flow/state.json` exists, briefly summarize its `stage`, `ticket`, and `mode`.
7. If old `ticket-flow/current.json` or `ticket-flow/invocation.json` exist, mention that dual-state legacy artifacts were also found and will be cleared.
8. If legacy markdown state exists, mention that legacy state was also found and will be cleared.
9. Overwrite `ticket-flow/state.json` with:

```json
{
  "version": 3,
  "ticket": null,
  "ticket_path": null,
  "run_token": null,
  "mode": "single",
  "stage": "done",
  "reason": "manual reset via /ticket-reset"
}
```

10. If old `ticket-flow/current.json` exists, overwrite it with the same JSON tombstone from step 9 so old sessions cannot confuse future runs.
11. If old `ticket-flow/invocation.json` exists, overwrite it with the same JSON tombstone from step 9 so old sessions cannot confuse future runs.
12. If legacy markdown state exists, overwrite it with these safe tombstones so old sessions cannot confuse future runs.

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
13. Report that orchestrator state was reset successfully.
