---
description: Reset an escalated ticket so it re-enters the ticket-flow pipeline
skill: ticket-flow
---
Un-escalate a ticket that was previously escalated by the ticket-flow review limit.

## Procedure

1. The user provides a ticket id as the first argument (e.g., `/ticket-unescalate ptf-1234`). Interpret `$1` as the ticket id. If `$1` is empty, ask the user which ticket to un-escalate.
2. Run `tk show <ticket>` and verify the ticket exists and contains a note with `Gate: ESCALATE`.
3. If no ESCALATE note exists, report that the ticket is not escalated and stop.
4. Run `tk add-note <ticket> "Gate: UNESCALATE — Ticket re-entered the ticket-flow pipeline. Previous escalation overridden. Review attempt counter preserved."`
5. Report that the ticket was un-escalated and is now eligible for ticket-flow selection again.

## Notes

- This adds a `Gate: UNESCALATE` note that supersedes the most recent `Gate: ESCALATE`. The selection logic checks the *last* Gate note to determine escalation status.
- The review attempt counter is not reset. If the ticket was at attempt 7/7, it will immediately re-escalate on the next REVISE. To also reset the counter, manually remove prior Gate: REVISE notes or ask for a counter-reset.
- Use `/ticket-flow` after un-escalating to process the ticket.
