---
description: Validate and fix the currently selected ticket using the base worker agent
model: zai/glm-5.1
subagent: worker
inheritContext: false
skill: ticket-test-fix
restore: true
---
Validate and fix the currently selected ticket until it is ready for review.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Keep validation scoped to the selected ticket and its implementation artifact.
- If prerequisites fail and validation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
