---
description: Deep ticket review with parallel review passes and final consolidation
chain: ticket-review-deep-handoff -> parallel(ticket-review-deep-correctness, ticket-review-deep-regression, ticket-review-deep-tests) -> ticket-review-deep-consolidate
chainContext: summary
restore: true
---
Perform a deep, high-confidence review of the currently selected ticket.
