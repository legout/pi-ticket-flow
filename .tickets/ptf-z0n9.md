---
id: ptf-z0n9
status: closed
deps: []
links: []
created: 2026-04-13T09:21:48Z
type: task
priority: 1
assignee: legout
---
# Delete the 6 ticket-review-deep prompt files

## Goal

Delete the 6 `ticket-review-deep-*.md` prompt files (259 lines total) that implement a parallel deep-review chain. The handoff step re-reads state and re-emits the handoff string, duplicating what ticket-pick already did. The value over single-pass review is marginal for most tickets.

## What to do

1. Verify nothing else references these prompts:

        grep -r "ticket-review-deep" prompts/ skills/ extensions/ README.md

2. Delete the 6 files:

        rm prompts/ticket-review-deep.md
        rm prompts/ticket-review-deep-handoff.md
        rm prompts/ticket-review-deep-correctness.md
        rm prompts/ticket-review-deep-regression.md
        rm prompts/ticket-review-deep-tests.md
        rm prompts/ticket-review-deep-consolidate.md

3. Update `skills/ticket-flow/SKILL.md` if it references the deep review chain.

4. Update `README.md` if it documents deep review commands.

5. Run all smoke tests.

If deep review is wanted in the future, it can be rebuilt as a `depth: deep` frontmatter option on `ticket-review.md` that instructs the reviewer to run multiple lenses within one session.

## Acceptance criteria

- All 6 `ticket-review-deep-*.md` files are deleted
- No remaining file references them
- All smoke tests pass
- README.md no longer documents deep review commands

## ExecPlan Reference

- Plan: `.ticket-flow/plans/ticket-flow-simplification/execplan.md`
- Milestone: M6 — Remove the deep-review parallel chain
- Read these sections before implementing:
  - "Context and Orientation" for the deep review file listing
  - Milestone 6 for this ticket's scope
  - "Decision Log" for any decisions already made

## Scheduling Hints

- Kind: cleanup
- Depends on: none
- Related to: M1 (also deletes prompt files)
- Conflicts with: none
- Parallel-safe with: M1, M2, M3, M4, M5
- Suggested worktree isolation: optional


## Notes

**2026-04-13T14:42:28Z**

Gate: PASS — all 6 ticket-review-deep prompt files deleted, references removed, all 5 smoke tests pass
