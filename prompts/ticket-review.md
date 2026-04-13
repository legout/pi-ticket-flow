---
description: Delegate critical ticket review to the base reviewer agent using the ticket-review workflow
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: false
skill: ticket-flow-delegated-handoff,ticket-review
restore: true
---
Critically review the currently selected ticket.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Follow the shared delegated handoff skill loaded for this step.
- Review exactly the selected ticket and the matching implementation / validation artifacts.
- If implementation or validation is already `blocked`, report that review is skipped and stop **without** `<!-- CHAIN_STOP -->` so finalization can still run.
- When writing the review artifact, use the exact lowercase contract keys from the `ticket-review` skill: `ticket:`, `step:`, `status:`, and `source_artifact:`.
- Do **not** substitute markdown labels like `**Reviewed:**` or `**Verdict:**` for those keys.
- Write the review artifact in the exact structure required by the `ticket-review` skill.
- If prerequisites fail and review cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
