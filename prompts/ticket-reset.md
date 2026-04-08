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

1. Try `read_artifact(name: "ticket-flow/current.md")`.
2. Try `read_artifact(name: "ticket-flow/invocation.md")`.
3. If both artifacts are missing, report that there is nothing to reset and stop.
4. If `ticket-flow/current.md` exists, briefly summarize the current `ticket` and `stage` from the artifact.
5. If `ticket-flow/invocation.md` exists, briefly summarize the current `status`, `mode`, and `ticket` from the artifact.
6. Overwrite `ticket-flow/current.md` with this tombstone format:

```md
ticket: reset
ticket_path: none
stage: done
implementation_artifact: none
validation_artifact: none
review_artifact: none
reason: manual reset via /ticket-reset
```

7. Overwrite `ticket-flow/invocation.md` with this blocked sentinel format:

```md
status: blocked
mode: single
ticket: none
run_token: none
reason: manual reset via /ticket-reset
```

8. Report that orchestrator state was reset successfully.
9. Stop.
