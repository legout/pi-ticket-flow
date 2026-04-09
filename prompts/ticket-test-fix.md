---
description: Validate and fix the currently selected ticket using the base worker agent
model: zai/glm-5.1, openai-codex/gpt-5.4-mini, kimi-coding/k2p5
subagent: worker
inheritContext: false
skill: ticket-test-fix
restore: true
---
Validate and fix the currently selected ticket until it is ready for review.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Keep validation scoped to the selected ticket and its implementation artifact.
- Write only the validation artifact for this step; do **not** overwrite `ticket-flow/current.md` here.
- When writing the validation artifact, use the exact lowercase contract keys from the `ticket-test-fix` skill (`ticket:`, `status:`, and `source_implementation_artifact:`).
- If prerequisites fail and validation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
