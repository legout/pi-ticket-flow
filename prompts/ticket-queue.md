---
description: Process ready tickets sequentially until the queue is empty (default) or a loop cap is reached
chain: ticket-pick queue -> ticket-implement -> ticket-test-fix -> ticket-review -> ticket-finalize
chainContext: summary
restore: true
loop: unlimited
fresh: true
converge: false
---
This command processes ready tk tickets one at a time using the simplified delegated ticket-flow chain.

Default behavior:
- run until no eligible tickets remain in `tk ready`

Optional behavior:
- pass `--loop N` to cap how many tickets are processed in this invocation

Queue tracking artifacts:
- `ticket-flow/invocation.json`
- `ticket-flow/current.json`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

Important:
- one ticket at a time only
- no parallel ticket execution
- stop when `tk ready` is empty or no eligible ticket remains
- use `signal_loop_success` only when the queue is truly complete for this invocation
