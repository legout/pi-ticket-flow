---
name: ticket-flow-delegated-handoff
description: Shared delegated handoff contract for fresh ticket-flow worker and reviewer steps.
---

# Ticket Flow Delegated Handoff

Fresh delegated steps must **not** read `ticket-flow/state.json`.

Read `ticket-flow/handoff.json` via `read_artifact`. Required keys: `ticket`, `ticket_path`, `mode`, `run_token`. Treat it as authoritative. If missing or malformed, stop, report the failure, and end with:

`<!-- CHAIN_STOP -->`

Derive artifact paths with `ticket_flow_artifact_paths` using `ticket` + `run_token`. Use `ticket_path` when reading the selected ticket file.

In delegated steps, read and write only run-specific evidence artifacts and do **not** overwrite `ticket-flow/state.json`.
