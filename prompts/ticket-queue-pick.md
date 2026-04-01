---
description: Queue entry step — select the next eligible ticket or stop the queue
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
This prompt is used only inside `/ticket-queue`.

Your job is to select the next eligible ticket for this queue iteration.
If no eligible tickets remain, you must:
1. update `ticket-flow/progress.md` to `status: done`
2. write a queue-complete tombstone to `ticket-flow/current.md`
3. call `signal_loop_success`
4. stop

Queue artifacts:
- `ticket-flow/current.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

## Progress artifact format

If `ticket-flow/progress.md` is missing, create it with this exact structure:

```md
# Ticket Queue Progress

status: running
started_at: <ISO-8601>
last_updated: <ISO-8601>
current_ticket: none
completed_tickets: 0
pass_count: 0
revise_count: 0
escalate_count: 0
blocked_count: 0

## Ticket History
- none yet
```

If `ticket-flow/lessons-learned.md` is missing, create it with:

```md
# Ticket Queue Lessons Learned

Add only durable, reusable lessons learned from implementing tickets.

## Lessons
- none yet
```

## Procedure

1. Try to read `ticket-flow/progress.md` using `read_artifact`.
2. If it is missing or malformed, write a fresh `ticket-flow/progress.md` using the exact format above.
3. Try to read `ticket-flow/lessons-learned.md` using `read_artifact`.
4. If it is missing, write the initial template above.
5. Try `read_artifact(name: "ticket-flow/current.md")`.
6. If `ticket-flow/current.md` exists, parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `review_artifact:`
7. If parsing fails, stop and tell the user to run `/ticket-reset`.
8. If `ticket-flow/current.md` exists and its `stage` is not `done`, stop and report that there is unfinished orchestrator state. Tell the user to finish that ticket with `/ticket-step` or `/ticket-direct` before rerunning `/ticket-queue`.
9. Run `tk ready`.
10. If no ready tickets exist:
    - update `ticket-flow/progress.md` to:
      - `status: done`
      - `last_updated: <now>`
      - `current_ticket: none`
    - write `ticket-flow/current.md` as:

```md
ticket: none
ticket_path: none
stage: done
implementation_artifact: none
review_artifact: none
reason: queue complete - no ready tickets remain
```

    - call `signal_loop_success`
    - stop immediately
11. Otherwise, inspect candidates in listed order:
    - prefer tickets already marked `[in_progress]`
    - then consider the remaining ready tickets
12. For each candidate, run `tk notes <ticket-id>` and skip it if the notes contain `Gate: ESCALATE`.
13. If no eligible ticket remains:
    - update `ticket-flow/progress.md` to `status: done`, `last_updated: <now>`, `current_ticket: none`
    - write `ticket-flow/current.md` as:

```md
ticket: none
ticket_path: none
stage: done
implementation_artifact: none
review_artifact: none
reason: queue complete - no eligible tickets remain
```

    - call `signal_loop_success`
    - stop immediately
14. Pick the first eligible ticket.
15. If the chosen ticket is not already `in_progress`, run `tk start <ticket-id>`.
16. Write `ticket-flow/current.md` with:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker
implementation_artifact: ticket-flow/<ticket-id>/implementation.md
review_artifact: ticket-flow/<ticket-id>/review.md
```

17. Update `ticket-flow/progress.md` by preserving the existing counters/history but setting:
    - `status: running`
    - `last_updated: <now>`
    - `current_ticket: <ticket-id>`
18. End with a short summary including the selected ticket id.
