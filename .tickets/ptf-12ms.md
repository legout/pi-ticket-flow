---
id: ptf-12ms
status: closed
deps: [ptf-gmdx]
links: []
created: 2026-04-13T09:21:48Z
type: task
priority: 1
assignee: legout
---
# Shrink ticket-pick from 172 lines to ~40 lines (tool-driven)

## Goal

Shrink `prompts/ticket-pick.md` from 172 lines to ~40 lines by making it a thin wrapper around deterministic tool calls. After M2 (single state) and M3 (artifact handoff), most of the 24-step ceremony evaporates. What remains is a straightforward 8-step procedure.

## What to do

Rewrite `prompts/ticket-pick.md` to approximately this structure:

    ---
    description: Pick exactly one eligible tk ticket and initialize ticket-flow state
    model: zai/glm-5-turbo, minimax/MiniMax-M2.7
    thinking: minimal
    skill: ticket-flow
    restore: true
    ---
    Pick exactly one eligible ticket for ticket-flow processing.

    Procedure:
    1. Read `ticket-flow/state.json`. If it exists and stage is not `done`, report unfinished state and stop.
    2. If old `invocation.json` or `current.json` exist, report legacy state and tell user to run `/ticket-reset`.
    3. Call `ticket_flow_select`. If no eligible ticket, write `state.json` with stage `done` and stop.
    4. Run `tk start <ticket>` if ticket is not already `in_progress`.
    5. Call `ticket_flow_new_run_token`.
    6. Write `ticket-flow/state.json` with the armed state.
    7. Write `ticket-flow/handoff.json` via `write_artifact`.
    8. In queue mode, initialize progress.md and lessons-learned.md if missing.

Optionally add a `ticket_flow_arm` tool to `extensions/ticket-flow-tools.ts` that wraps steps 4-6 into one deterministic call.

Run all smoke tests after the rewrite.

## Acceptance criteria

- `prompts/ticket-pick.md` is under 60 lines (from 172)
- The prompt is a thin wrapper: read state, call tool, write state, write handoff
- All smoke tests pass
- No functionality is lost (queue mode init, legacy detection, CHAIN_STOP)

## ExecPlan Reference

- Plan: `.ticket-flow/plans/ticket-flow-simplification/execplan.md`
- Milestone: M4 — Merge ticket-pick ceremony into tool-driven flow
- Read these sections before implementing:
  - "Context and Orientation" for the current ticket-pick procedure
  - Milestone 4 for this ticket's scope
  - "Interfaces and Dependencies" for types and contracts
  - "Decision Log" for any decisions already made

## Scheduling Hints

- Kind: vertical-slice
- Depends on: ptf-gmdx (M3 — artifact-based handoff must exist)
- Related to: M2 (state simplification), M7 (finalize also shrinks)
- Conflicts with: none
- Parallel-safe with: M5, M6
- Suggested worktree isolation: recommended


## Notes

**2026-04-13T15:45:44Z**

Gate: REVISE — Review Attempt: 1/3 — queue-mode telemetry bootstrap (progress.md / lessons-learned.md) is skipped when ticket_flow_select returns no eligible ticket. Fix: move queue artifact initialization before the selection call.

**2026-04-13T16:00:32Z**

Gate: PASS — ticket-pick shrunk to 25 lines, queue-mode telemetry bootstrap fixed, all smoke tests pass
