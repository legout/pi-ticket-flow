---
description: Delegate ticket implementation to the base worker agent using the ticket-implement workflow
model: kimi-coding/k2.6-code-preview, zai/glm-5-turbo, minimax/MiniMax-M2.7, openai-codex/gpt-5.4-mini
subagent: worker
inheritContext: false
skill: ticket-flow-delegated-handoff,ticket-implement
restore: true
---
Implement the currently selected ticket only.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Follow the shared delegated handoff skill loaded for this step.
- Do **not** implement a child ticket or sibling ticket instead of the selected ticket.
- Do **not** run repo validation commands here; leave the result ready for validation.
- Write only the implementation artifact for this step; do **not** advance the workflow beyond implementation.
- The implementation artifact must use the exact lowercase contract keys from the `ticket-implement` skill: `ticket:`, `step:`, `status:`, and `source_artifact:`.
- If prerequisites fail and implementation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
