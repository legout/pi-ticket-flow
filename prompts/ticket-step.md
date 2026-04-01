---
description: Direct fallback implementation — process exactly one tk ticket end-to-end
model: zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
skill: ticket-flow
restore: true
---
Process exactly one ticket using the direct Ralph-Wiggum one-ticket state machine.

This command is intentionally single-ticket and non-parallel.
This is the **fallback/direct** implementation.
Use `/ticket-flow` or `/ticket-flow-chain` for the delegated chain-based implementation.

## 1) Resume orchestrator state first

First try to read `ticket-flow/current.md` using `read_artifact`.

When parsing `ticket-flow/current.md`, require exactly one line each with these exact prefixes:
- `ticket:`
- `ticket_path:`
- `stage:`
- `implementation_artifact:`
- `review_artifact:`

If any required key is missing or duplicated, stop and tell the user to run `/ticket-reset`.

If it exists and contains `stage: waiting-worker`:
- try to read the implementation artifact referenced there
- if the implementation artifact is missing, do **not** spawn another worker
- report that the workflow is waiting for the worker artifact and stop
- if the implementation artifact exists and contains `status: blocked`:
  - add a concise escalation note with `Gate: ESCALATE` explaining that implementation blocked before review
  - update `ticket-flow/current.md` so `stage: done`
  - stop immediately
- if the implementation artifact exists and is not blocked:
  - update `ticket-flow/current.md` so `stage: waiting-review`
  - spawn a fresh `ticket-reviewer` subagent for the same ticket
  - stop immediately

If `ticket-flow/current.md` exists and contains `stage: waiting-review`:
- try to read the review artifact referenced there
- if the review artifact is missing, do **not** spawn another reviewer
- report that the workflow is waiting for the reviewer artifact and stop
- if the review artifact exists:
  - read both the review artifact and the implementation artifact
  - run `tk notes <ticket-id>` and count prior `Gate: REVISE` notes
  - parse `gate: PASS` or `gate: REVISE`
  - if PASS:
    - add a concise structured ticket note with `tk add-note <ticket-id> ...`
    - close the ticket with `tk close <ticket-id>`
  - if REVISE and this is review failure 1 or 2:
    - add a concise structured review note with `tk add-note <ticket-id> ...`
    - include `Review Attempt: <N>/3`
    - leave the ticket `in_progress`
  - if REVISE and this is review failure 3:
    - add an escalation note with `Gate: ESCALATE`
    - include that the max automatic retries were reached
    - leave the ticket `in_progress`
  - update `ticket-flow/current.md` so `stage: done`
  - stop immediately

If `ticket-flow/current.md` exists and contains `stage: done`, ignore it and continue to ticket selection.

If `ticket-flow/current.md` does not exist, continue to ticket selection.

## 2) Select exactly one eligible ticket

Run `tk ready`.

If it is empty:
- report that there are no ready tickets
- stop

Otherwise, inspect candidates in listed order:
- prefer tickets already marked `[in_progress]`
- then consider the remaining ready tickets

For each candidate:
- run `tk notes <ticket-id>`
- if the notes already contain `Gate: ESCALATE`, skip that ticket

Pick the first ticket that is not escalated.

If no eligible ticket remains:
- report that all ready tickets are escalated or otherwise ineligible
- stop

If the chosen ticket is not already `in_progress`, run `tk start <ticket-id>`.

Never select more than one ticket.
Never start a second ticket while another ticket is active in this workflow.

## 3) Write orchestrator state

Write `ticket-flow/current.md` with this exact shape:

```md
ticket: <ticket-id>
ticket_path: .tickets/<ticket-id>.md
stage: waiting-worker
implementation_artifact: ticket-flow/<ticket-id>/implementation.md
review_artifact: ticket-flow/<ticket-id>/review.md
```

## 4) Spawn the fresh worker

Spawn a fresh subagent with:
- `agent: "ticket-worker"`
- `fork: false`
- `cwd` set to the project root

The worker task must instruct it to:
- read `.tickets/<ticket-id>.md`
- read `tk notes <ticket-id>`
- gather all relevant code context first
- implement exactly this ticket
- run `ty check`
- run `mypy src/`
- run `pytest tests/ -x -v`
- fix until all pass or write `status: blocked`
- write `ticket-flow/<ticket-id>/implementation.md`
- not call `tk add-note`
- not call `tk close`

After spawning the worker, stop immediately.

## 5) Finalization note formatting

For PASS, add a note that includes:
- `Gate: PASS`
- brief implementation summary
- validation summary

For REVISE, add a note that includes:
- `Gate: REVISE`
- `Review Attempt: <N>/3`
- the key findings from the review artifact with severity, file, and remediation

For ESCALATE, add a note that includes:
- `Gate: ESCALATE`
- that the maximum automatic retries were reached or that implementation blocked before review
- the key findings from the relevant artifact with severity, file, and remediation when available
- that human intervention is required

## Hard constraints

- one ticket per invocation only
- no parallel ticket handling
- no prompt loops
- no reliance on convergence
- do not implement product code in the main session
- artifacts are the durable handoff contract
