---
description: Deprecated compatibility shim; delegated ticket-flow steps no longer mutate current.json
model: openai-codex/gpt-5.4-mini, zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
restore: true
---
This command is deprecated.

Delegated ticket-flow steps no longer mutate `ticket-flow/current.json`.

Do not modify workflow state here.

Report that `/ticket-mark-review` is deprecated and tell the user to run `/ticket-flow`, `/ticket-test-fix`, or `/ticket-review` instead.

End with the exact final line:

`<!-- CHAIN_STOP -->`
