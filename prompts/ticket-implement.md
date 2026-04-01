---
description: Delegate ticket implementation to the fresh ticket-worker subagent
model: kimi-coding/k2p5
subagent: ticket-worker
inheritContext: false
restore: true
---
Implement the currently selected Ralph-Wiggum ticket.

Required procedure:
1. Read `ticket-flow/current.md` using `read_artifact`.
2. Parse it using exact single-occurrence line prefixes:
   - `ticket:`
   - `ticket_path:`
   - `stage:`
   - `implementation_artifact:`
   - `review_artifact:`
3. If parsing fails, stop and tell the user to run `/ticket-reset`.
4. Extract:
   - `ticket`
   - `ticket_path`
   - `implementation_artifact`
5. Read the ticket file.
6. Run `tk notes <ticket>`.
7. Gather all relevant repo context before editing.
8. Implement exactly this ticket.
9. Run and fix until green:
   - `ty check`
   - `mypy src/`
   - `pytest tests/ -x -v`
10. Write the implementation artifact to the exact path from `ticket-flow/current.md`.
11. If blocked, write `status: blocked` clearly in the artifact.
12. Do not call `tk add-note`.
13. Do not call `tk close`.
14. End with a short summary naming the ticket id and artifact path.
