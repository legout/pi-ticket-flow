---
id: ptf-gmdx
status: closed
deps: [ptf-7o9t]
links: []
created: 2026-04-13T09:16:13Z
type: task
priority: 1
assignee: legout
---
# Move handoff from in-band string to ticket-flow/handoff.json artifact

## Goal

Replace the fragile in-band `Selection handoff JSON: {...}` string (emitted in ticket-pick's assistant message and parsed from chain context by delegated steps) with a durable session artifact `ticket-flow/handoff.json`. This survives summarization and removes the "parse the most recent marker" logic from every delegated skill.

## What to do

1. Edit `skills/ticket-flow-delegated-handoff/SKILL.md`:
   - Replace "look for the most recent exact marker in the delegated prompt context" with "read `ticket-flow/handoff.json` via `read_artifact`"
   - Keep the same JSON shape requirements: `ticket`, `ticket_path`, `mode`, `run_token`
   - Keep `<!-- CHAIN_STOP -->` for missing/malformed handoff
   - The skill should shrink from ~63 lines to ~25 lines

2. Edit `prompts/ticket-pick.md`:
   - Replace the `Selection handoff JSON: {...}` emission with `write_artifact(name: "ticket-flow/handoff.json", content: ...)`
   - The final assistant message can still include a human-readable summary, but the structured handoff data lives in the artifact

3. Edit `skills/ticket-implement/SKILL.md`:
   - Update step 1 to read `ticket-flow/handoff.json` via `read_artifact` instead of parsing chain context

4. Edit `skills/ticket-test-fix/SKILL.md`:
   - Same change as ticket-implement

5. Edit `skills/ticket-review/SKILL.md`:
   - Same change as ticket-implement

6. Run all smoke tests.

## Acceptance criteria

- No skill or prompt contains `Selection handoff JSON:` as a parsing instruction
- `ticket-pick` writes `handoff.json` via `write_artifact`
- All three delegated skills read `handoff.json` via `read_artifact`
- The `ticket-flow-delegated-handoff` skill is under 25 lines
- All smoke tests pass

## ExecPlan Reference

- Plan: `.ticket-flow/plans/ticket-flow-simplification/execplan.md`
- Milestone: M3 — Move handoff from in-band string to `ticket-flow/handoff.json` artifact
- Read these sections before implementing:
  - "Context and Orientation" for the current handoff contract
  - Milestone 3 for this ticket's scope
  - "Interfaces and Dependencies" → "Handoff artifact interface"
  - "Decision Log" for any decisions already made

## Scheduling Hints

- Kind: vertical-slice
- Depends on: ptf-7o9t (M2 — single state must exist first)
- Related to: M4 (ticket-pick simplification builds on this)
- Conflicts with: none
- Parallel-safe with: M5, M6
- Suggested worktree isolation: recommended


## Notes

**2026-04-13T15:30:04Z**

Gate: PASS — handoff migrated from in-band string to ticket-flow/handoff.json artifact, all delegated skills updated, smoke tests pass
