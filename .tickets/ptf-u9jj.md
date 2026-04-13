---
id: ptf-u9jj
status: closed
deps: [ptf-7o9t, ptf-gmdx, ptf-yopv]
links: []
created: 2026-04-13T09:21:48Z
type: task
priority: 1
assignee: legout
---
# Simplify ticket-finalize from 35 steps to ~10 steps

## Goal

Rewrite `prompts/ticket-finalize.md` from 127 lines / 35 steps to ~50 lines / ~10 steps. After M2 (single state), M3 (artifact handoff), and M5 (unified artifacts), the finalization procedure collapses dramatically. Most of the removed steps are dual-state consistency checks, advisory-only `current.json` handling, and three different artifact parsing routines.

## What to do

Rewrite `prompts/ticket-finalize.md` to this simplified procedure:

1. Read `ticket-flow/state.json` via `read_artifact`. Verify `stage` is not `done`.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the implementation artifact. If missing or `status: blocked`, escalate.
4. Read the validation artifact. If missing or `status: blocked`, escalate.
5. Read the review artifact. If missing, stop.
6. Count prior revise notes via `tk show <ticket>`.
7. If `status: pass`, add PASS note and close ticket.
8. If `status: revise` and attempt ≤ 2, add REVISE note, leave in progress.
9. If `status: revise` and attempt 3, escalate.
10. Write `state.json` with `stage: "done"`. Update queue progress if in queue mode.

Also verify `skills/ticket-flow/SKILL.md` finalization model section matches the simplified procedure.

Run all smoke tests.

## Acceptance criteria

- `prompts/ticket-finalize.md` is under 60 lines (from 127)
- The procedure has ~10 steps (from 35)
- No references to `invocation.json` or `current.json`
- No references to `gate:` (uses `status: pass | revise`)
- Reads one `state.json` instead of two files
- All smoke tests pass

## ExecPlan Reference

- Plan: `.ticket-flow/plans/ticket-flow-simplification/execplan.md`
- Milestone: M7 — Simplify ticket-finalize to match the new simpler state model
- Read these sections before implementing:
  - "Context and Orientation" for the current finalization model
  - Milestone 7 for this ticket's scope and the 10-step procedure
  - "Interfaces and Dependencies" for the new state.json and unified artifact schema
  - "Decision Log" for any decisions already made

## Scheduling Hints

- Kind: vertical-slice
- Depends on: ptf-7o9t (M2), ptf-gmdx (M3), and the M5 ticket (unified artifacts)
- Related to: M4 (ticket-pick also simplified)
- Conflicts with: none
- Parallel-safe with: M6
- Suggested worktree isolation: recommended


## Notes

**2026-04-13T19:46:20Z**

Gate: PASS — Simplified ticket-finalize.md from 127 lines/35 steps to 27 lines/10 steps. All acceptance criteria verified. All smoke tests pass. Review attempt 1/3.
