---
description: Prepare delegated handoff for deep ticket review from the active invocation
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Prepare a delegated handoff for deep ticket review of the currently selected ticket.

Rules:
- This step runs in the main session.
- It must not spawn subagents.
- It must not edit code.
- It must not write the canonical review artifact.
- It may read `ticket-flow/current.json` only as advisory context.

If the active invocation is missing or malformed and deep review cannot safely start, end your response with the exact final line:

`<!-- CHAIN_STOP -->`

## Procedure

1. Read `ticket-flow/invocation.json` using `read_artifact`.
2. Parse it as JSON. Required keys:
   - `status`
   - `mode`
   - `ticket`
   - `run_token`
   - optional `ticket_path`
   - optional `reason`
3. If parsing fails, stop and report that the deep review handoff cannot be prepared because the active invocation is malformed.
4. If `status` is not `armed`, stop and report that deep review is not armed for the current invocation.
5. Optionally read `ticket-flow/current.json` as advisory context only. Do not require it.
6. Resolve `ticket_path` from `invocation.ticket_path` when present; otherwise, for legacy runs, assume `.tickets/<ticket>.md`.
7. Ensure `ticket`, resolved `ticket_path`, and `run_token` are present.
8. If any of those checks fail, stop and report that the active invocation is missing required ticket metadata.
9. End with a short summary whose **first line** is exactly:

`Selection handoff JSON: {"ticket":"<ticket-id>","ticket_path":"<ticket-path>","mode":"<single|queue>","run_token":"<run-token>"}`

Rules for this handoff:
- keep it on one line
- use compact JSON
- do not wrap it in code fences
- do not add extra keys
- do not include markdown tables
- keep any additional human summary short so the handoff survives chain-context summarization
