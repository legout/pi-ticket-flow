---
id: ptf-yozb
status: open
deps: []
links: []
created: 2026-04-13T19:25:32Z
type: task
priority: low
assignee: legout
---
# Document delegated-step recovery in skills and finalize prompt

## Goal

Update the ticket-flow skill and prompt files so that bridge-side recovery is documented where the workflow rules already live. This is documentation-only — no behavioral change.

## Concrete steps

1. Edit `skills/ticket-flow/SKILL.md`:
   - In the finalization model section, add a note that bridge-side recovery may synthesize blocked or revise artifacts after delegated failure, and `ticket-finalize` treats those as authoritative evidence.

2. Edit `skills/ticket-implement/SKILL.md`:
   - Add a rule: "If a validation command is blocked by policy, the orchestrator bridge may synthesize a blocked implementation artifact on your behalf."

3. Edit `skills/ticket-test-fix/SKILL.md`:
   - Add a rule: "If this step fails unexpectedly, the orchestrator bridge may synthesize a blocked validation artifact."

4. Edit `skills/ticket-review/SKILL.md`:
   - Add a rule: "If this step fails unexpectedly, the orchestrator bridge may synthesize a `status: revise` review artifact."

5. Edit `prompts/ticket-finalize.md`:
   - Add a note near the state/artifact checks: "Delegated-step recovery may synthesize blocked or revise artifacts after subagent failures. These are authoritative evidence artifacts — treat them the same as worker/reviewer-written artifacts."

## Acceptance criteria

- All five files have the new documentation lines.
- All smoke tests pass (no behavioral change expected).

## ExecPlan Reference

- Plan: `.ticket-flow/plans/delegated-step-recovery/execplan.md`
- Milestone: M4 (Prompt and skill tightening for delegated recovery)
- Read these sections before implementing:
  - "Context and Orientation" for the recovery behavior summary
  - Milestone 4 for this ticket's scope

## Scheduling Hints

- Kind: cleanup
- Depends on: none
- Related to: ptf-gm5j (bridge recovery), ptf-ykcc (smoke tests)
- Conflicts with: none
- Parallel-safe with: ptf-gm5j, ptf-ykcc (touches different files)
- Suggested worktree isolation: optional

