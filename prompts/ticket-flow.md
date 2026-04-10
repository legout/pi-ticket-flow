---
description: Process exactly one tk ticket via delegated ticket-flow chain
chain: ticket-pick -> ticket-implement -> ticket-test-fix -> ticket-review -> ticket-finalize
chainContext: summary
restore: true
---
This command runs the simplified delegated ticket-flow one-ticket chain.

Flow:
- pick one eligible ticket
- implement it with a fresh worker
- validate/fix it with a fresh worker
- review it with a fresh reviewer
- finalize the outcome

Fallback:
- Use `/ticket-queue` for sequential multi-ticket processing.
- Use `/ticket-reset` to clear stale or legacy state.
