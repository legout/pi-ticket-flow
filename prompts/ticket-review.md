---
description: Delegate critical ticket review to the base reviewer agent using the ticket-review workflow
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: false
skill: ticket-review
restore: true
---
Critically review the currently selected ticket.
