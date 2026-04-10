---
description: Deprecated compatibility shim; validation stage advancement now happens inside ticket-test-fix
model: openai-codex/gpt-5.4-mini, zai/glm-5-turbo, minimax/MiniMax-M2.7
thinking: minimal
restore: true
---
This command is deprecated.

Stage advancement into `waiting-validation` now happens automatically inside `/ticket-test-fix` using `ticket-flow/current.json`.

Do not modify workflow state here.

Report that `/ticket-mark-validation` is deprecated and tell the user to run `/ticket-flow` or `/ticket-test-fix` instead.

End with the exact final line:

`<!-- CHAIN_STOP -->`
