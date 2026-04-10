---
name: ticket-flow-delegated-handoff
description: Shared delegated handoff contract for fresh ticket-flow worker and reviewer steps.
---

# Ticket Flow Delegated Handoff

This shared skill applies to fresh delegated ticket-flow steps such as:

- `ticket-implement`
- `ticket-test-fix`
- `ticket-review`
- `ticket-review-deep-*`

## Shared rule

Fresh delegated worker / reviewer sessions must **not** read shared machine-state artifacts such as:

- `ticket-flow/invocation.json`
- `ticket-flow/current.json`

Those files are owned by main-session orchestration steps.

## Authoritative handoff

Instead, consume the compact selection handoff forwarded through chain context.

Look for the most recent exact marker in the delegated prompt context:

`Selection handoff JSON: {...}`

Parse the JSON object immediately following that marker. Required keys:

- `ticket`
- `ticket_path`
- `mode`
- `run_token`

Treat that handoff as authoritative for the selected ticket and run.
If any shared state artifact or stale session context disagrees, the handoff wins for this delegated step.

## Failure handling

If the handoff is missing or malformed:

- stop and report that the delegated selection handoff was not forwarded correctly
- end your final response with the exact line:

`<!-- CHAIN_STOP -->`

## Artifact derivation

Use `ticket_flow_artifact_paths` with `ticket` + `run_token` from the handoff.

Use `ticket_path` from the handoff when reading the selected ticket file.

## Artifact ownership

In delegated steps:

- read and write only the run-specific evidence artifacts relevant to the step
- do **not** overwrite `ticket-flow/current.json`
- do **not** overwrite `ticket-flow/invocation.json`
