---
description: Validate and fix the currently selected ticket using the base worker agent
model: zai/glm-5.1, openai-codex/gpt-5.4-mini, kimi-coding/k2.6
subagent: worker
inheritContext: false
skill: ticket-flow-delegated-handoff,ticket-test-fix
restore: true
---
Validate and fix the currently selected ticket until it is ready for review.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Follow the shared delegated handoff skill loaded for this step.
- Validate the **current checkout as-is**; do **not** use `git stash`, `git reset`, `git restore`, `git checkout --`, or other worktree-rewriting commands.
- Prefer targeted validation first; broaden to repo-wide commands only when the repo or ticket actually warrants it.
- If broader validation exposes unrelated failures, or the implementation described by the artifact is missing from the worktree, write a truthful `blocked` artifact instead of reconstructing or rewinding the checkout.
- This step writes only the validation artifact; it does **not** advance `ticket-flow/state.json`.
- If implementation is already `blocked`, or validation is already recorded, report that normal workflow outcome and stop **without** `<!-- CHAIN_STOP -->` so finalization can still run.
- When writing the validation artifact, use the exact lowercase contract keys from the `ticket-test-fix` skill: `ticket:`, `step:`, `status:`, and `source_artifact:`.
- If prerequisites fail and validation cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
