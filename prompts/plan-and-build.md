---
description: Planning and build workflow launcher for plan, ticketize, and ticket queue
model: kimi-coding/k2p5, anthropic/claude-sonnet-4-20250514
thinking: high
restore: true
---

If `$@` is empty, ask the user for a topic before proceeding.

Help launch the planning and build workflow for: $@

This command cannot be a native chain because pi prompt-template chains do not support nesting another chain template like `/ticket-queue`, and the `/plan` step may be interactive.

Procedure:

1. Derive `<topic-slug>` from `$@` using kebab-case, lowercase normalization.
2. Check whether `.ticket-flow/plans/<topic-slug>/brainstorm.md` already exists for the requested topic.
3. If the brainstorm does not exist:
   - if the `run-prompt` tool is enabled, use it to run `/plan $@`
   - otherwise, tell the user to run `/plan $@` manually
   - if you queued `/plan $@`, stop immediately after queueing it
   - if `run-prompt` is unavailable, stop after giving the manual instruction
   - do not queue `/ticketize` or `/ticket-queue` yet
4. If the brainstorm already exists and the topic is ready for non-interactive planning/build steps, the remaining sequence is:
   - `/plan-chain $@`
   - then `/ticketize $@`
   - then `/ticket-queue`
5. If the `run-prompt` tool is enabled, queue only the immediate next safe step:
   - queue `/plan-chain $@`
   - then stop immediately
   - tell the user to run `/ticketize $@` and `/ticket-queue` after planning finishes
6. If the `run-prompt` tool is unavailable, tell the user to run the sequence from step 4 manually and stop.

Prerequisites:
- `tk` must be available in the target project.
- The target project should use `.tickets/`.
- Run pi inside `cmux`, `tmux`, or `zellij`.
