---
description: Process exactly one tk ticket via delegated ticket-flow chain
chain: ticket-pick -> ticket-implement -> ticket-mark-review -> ticket-review -> ticket-finalize
chainContext: summary
restore: true
---
This command runs the delegated Ralph-Wiggum one-ticket chain.

Fallback:
- Use `/ticket-step` for the direct imperative fallback implementation.
- Use `/ticket-reset` to clear stale orchestrator state.
