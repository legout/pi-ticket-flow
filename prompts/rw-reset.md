---
description: Deprecated alias for /ticket-reset
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
2. If the artifact does not exist, report that there is nothing to reset and stop.
3. If it exists, briefly summarize the current `ticket` and `stage` from the artifact.
4. Overwrite `ticket-flow/current.md` with this tombstone format:

```md
ticket: reset
ticket_path: none
stage: done
implementation_artifact: none
review_artifact: none
reason: manual reset via /ticket-reset
```

5. Report that orchestrator state was reset successfully.
6. Stop.
