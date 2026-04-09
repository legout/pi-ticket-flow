---
description: Delegate ticket implementation to the base worker agent using the ticket-implement workflow
model: kimi-coding/k2p5
subagent: worker
inheritContext: false
skill: ticket-implement
restore: true
---
Implement the currently selected ticket only.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Do **not** implement a child ticket or sibling ticket instead of the selected ticket.
- Do **not** run repo validation commands here; leave the result ready for validation.
- If prerequisites fail and implementation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
