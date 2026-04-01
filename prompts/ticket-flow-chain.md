---
description: Explicit alias for the delegated ticket-flow chain
chain: ticket-pick -> ticket-implement -> ticket-mark-review -> ticket-review -> ticket-finalize
chainContext: summary
restore: true
---
This command runs the delegated ticket-flow one-ticket chain.

Preferred command:
- `/ticket-flow`

Related commands:
- `/ticket-direct` for the direct fallback implementation
- `/ticket-step` for the direct fallback implementation
- `/ticket-reset` to clear stale orchestrator state
