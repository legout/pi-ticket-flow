---
description: Validate and fix the currently selected ticket using the base worker agent
model: zai/glm-5.1, openai-codex/gpt-5.4-mini, kimi-coding/k2p5
subagent: worker
inheritContext: false
skill: ticket-test-fix
restore: true
---
Validate and fix the currently selected ticket until it is ready for review.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Read machine state from `ticket-flow/invocation.json` and `ticket-flow/current.json`.
- Derive implementation / validation / review artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
- Validate the **current checkout as-is**; do **not** use `git stash`, `git reset`, `git restore`, `git checkout --`, or other worktree-rewriting commands.
- Prefer targeted validation first; broaden to repo-wide commands only when the repo or ticket actually warrants it.
- If broader validation exposes unrelated failures, or the implementation described by the artifact is missing from the worktree, write a truthful `blocked` artifact instead of reconstructing or rewinding the checkout.
- This step now owns stage advancement into `waiting-validation` / `waiting-review` by updating `ticket-flow/current.json` when appropriate.
- If implementation is already `blocked`, or validation is already recorded, report that normal workflow outcome and stop **without** `<!-- CHAIN_STOP -->` so finalization can still run.
- When writing the validation artifact, use the exact lowercase contract keys from the `ticket-test-fix` skill (`ticket:`, `status:`, and `source_implementation_artifact:`).
- If prerequisites fail and validation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
