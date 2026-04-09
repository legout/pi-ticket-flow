---
description: Delegate critical ticket review to the base reviewer agent using the ticket-review workflow
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: false
skill: ticket-review
restore: true
---
Critically review the currently selected ticket.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Review exactly the selected ticket and the matching implementation/validation artifacts.
- If prerequisites fail and review cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
