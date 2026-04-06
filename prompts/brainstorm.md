---
description: Interactive brainstorming session for a topic or feature idea
model: openai-codex/gpt-5.4
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
6. **Optional external research:** if the topic appears to depend on external technology choices, APIs, frameworks, libraries, or current best practices, first check whether a `researcher` subagent is available via `subagents_list`. If it is available, spawn it to gather the latest docs, trade-offs, and best practices relevant to the topic, then use its findings as brainstorming context. If no `researcher` agent is available, continue without it.

Follow the brainstorm skill exactly for the exploration and convergence phases.

When the session concludes, write `.ticket-flow/plans/<topic-slug>/brainstorm.md` using the skill's output format.

Report the file path and suggest running `/plan-chain $@` or `/plan-create $@` next.
