---
description: Delegate ticket implementation to the fresh ticket-worker subagent
model: kimi-coding/k2p5
subagent: ticket-worker
inheritContext: false
restore: true
---
Implement the currently selected ticket.

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
   - `stage`
   - `implementation_artifact`
5. If `ticket` is `none` or `reset`, or `ticket_path` is `none`, stop and report that no ticket is selected for implementation.
6. If `stage` is not `waiting-worker`, stop and report that implementation can only run from the `waiting-worker` stage.
7. Read the ticket file.
8. Run `tk notes <ticket>`.
9. Gather all relevant repo context before editing.
10. Implement exactly this ticket.
11. Run and fix until green using the repo's relevant validation commands.
   - Prefer the project's documented test, typecheck, lint, and build commands from files like `package.json`, `Makefile`, `justfile`, CI config, or `README.md`.
   - If the repo clearly uses commands such as `ty check`, `mypy src/`, or `pytest tests/ -x -v`, include them.
   - Record the exact commands you ran in the implementation artifact.
12. Write the implementation artifact to the exact path from `ticket-flow/current.md`.
13. If blocked, write `status: blocked` clearly in the artifact.
14. Do not call `tk add-note`.
15. Do not call `tk close`.
16. End with a short summary naming the ticket id and artifact path.
