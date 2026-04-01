---
description: Deprecated alias for /ticket-review
model: openai-codex/gpt-5.4-mini
subagent: ticket-reviewer
inheritContext: false
restore: true
---
Critically review the currently selected ticket.

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
   - `review_artifact`
5. Read the ticket file.
6. Read the implementation artifact.
7. Inspect the current diff and relevant changed files.
8. Write the review artifact to the exact path from `ticket-flow/current.md`.
9. Do not edit code.
10. Do not call `tk add-note`.
11. Do not call `tk close`.
12. End with a short summary naming the ticket id, gate, and artifact path.
