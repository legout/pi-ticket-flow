---
description: Interactive brainstorming session for a topic or feature idea
model: kimi-coding/k2p5, anthropic/claude-sonnet-4-20250514
thinking: high
skill: brainstorm
restore: true
---

If `$@` is empty, ask the user for a topic before proceeding.

Run an interactive brainstorming session for this topic: $@

Procedure:

1. Derive the topic slug from `$@` (kebab-case, lowercase, max 40 chars).
2. Check if `.ticket-flow/plans/<topic-slug>/brainstorm.md` already exists.
3. If it exists and status is `complete`, report that a brainstorm already exists and suggest running `/plan-chain $@` or `/plan-create $@` next. Stop.
4. If it exists and status is `in-progress`, offer to resume or restart.
5. If it does not exist, start the interactive brainstorming session following the brainstorm skill.

Follow the brainstorm skill exactly for the exploration and convergence phases.

When the session concludes, write `.ticket-flow/plans/<topic-slug>/brainstorm.md` using the skill's output format.

Report the file path and suggest running `/plan-chain $@` or `/plan-create $@` next.
