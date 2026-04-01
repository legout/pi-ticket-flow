---
description: Process exactly one tk ticket via prompt-template delegated chain
chain: rw-pick -> rw-implement -> rw-mark-review -> rw-review -> rw-finalize
chainContext: summary
restore: true
---
This command runs the delegated Ralph-Wiggum one-ticket chain.

Fallback:
- Use `/rw-step` for the direct imperative fallback implementation.
- Use `/rw-reset` to clear stale orchestrator state.
