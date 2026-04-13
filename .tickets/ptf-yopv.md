---
id: ptf-yopv
status: closed
deps: [ptf-7o9t]
links: []
created: 2026-04-13T09:21:48Z
type: task
priority: 1
assignee: legout
---
# Unify three artifact schemas into one envelope

## Goal

Replace the three different artifact schemas (implementation, validation, review) with one unified envelope. Today each step uses different contract keys (`status:`, `gate:`, `source_implementation_artifact:`). After this change, all three steps use the same keys: `step`, `status`, `source_artifact`.

The unified envelope:

    # <Step Title> Result

    ticket: <ticket-id>
    step: implement | validate | review
    status: ready-for-validation | ready-for-review | blocked | pass | revise
    source_artifact: <path or none>

    ## Summary
    ...
    ## Files Changed
    ...
    ## Evidence
    ...
    ## Remaining Issues
    ...

Key changes from today:
- `step` replaces the implicit step identity
- `status` uses one vocabulary instead of three
- `source_artifact` replaces `source_implementation_artifact`
- `gate: PASS | REVISE` becomes `status: pass | revise`

## What to do

1. Edit `skills/ticket-implement/SKILL.md` — update artifact contract to use `step: implement`, `status: ready-for-validation | blocked`

2. Edit `skills/ticket-test-fix/SKILL.md` — update to use `step: validate`, `status: ready-for-review | blocked`, `source_artifact: <implementation path>`

3. Edit `skills/ticket-review/SKILL.md` — replace `gate: PASS | REVISE` with `status: pass | revise`, add `step: review`

4. Edit `prompts/ticket-implement.md` — reference the unified format

5. Edit `prompts/ticket-test-fix.md` — reference the unified format

6. Edit `prompts/ticket-review.md` — reference the unified format

7. Edit `prompts/ticket-finalize.md` — parse one unified schema instead of three different ones

8. Run all smoke tests.

## Acceptance criteria

- All three skills use the same artifact envelope (same `step`, `status`, `source_artifact` keys)
- No skill or prompt uses `gate:` as an artifact key
- No skill or prompt uses `source_implementation_artifact:`
- `ticket-finalize.md` parses one schema format
- All smoke tests pass

## ExecPlan Reference

- Plan: `.ticket-flow/plans/ticket-flow-simplification/execplan.md`
- Milestone: M5 — Unify the three artifact schemas into one envelope
- Read these sections before implementing:
  - "Context and Orientation" → "Artifact contracts" for current schemas
  - Milestone 5 for this ticket's scope and the unified envelope
  - "Interfaces and Dependencies" → "Evidence artifact interface"
  - "Decision Log" for any decisions already made

## Scheduling Hints

- Kind: vertical-slice
- Depends on: ptf-7o9t (M2 — references new state.json)
- Related to: M7 (finalize simplification benefits from unified schema)
- Conflicts with: none
- Parallel-safe with: M3, M4, M6
- Serialization points: `prompts/ticket-finalize.md` is also touched by M7
- Suggested worktree isolation: recommended


## Notes

**2026-04-13T18:16:34Z**

Gate: PASS — unified artifact envelope (step, status, source_artifact) implemented across all skills/prompts, ticket-finalize parses unified schema, all smoke tests pass
