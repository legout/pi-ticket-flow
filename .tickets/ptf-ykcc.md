---
id: ptf-ykcc
status: closed
deps: [ptf-gm5j]
links: []
created: 2026-04-13T19:25:18Z
type: task
priority: medium
assignee: legout
---
# Smoke tests for delegated recovery

## Goal

Add a dedicated smoke test suite that validates the recovery helper from the bridge recovery ticket. This ensures the recovery logic (preserve valid artifact, repair malformed, synthesize missing, skip non-ticket-flow) is correct without launching actual subagents.

## Concrete steps

1. Create `scripts/smoke-delegated-recovery.ts` following the existing smoke test pattern (see `scripts/smoke-delegated-policy.ts` for the convention: `runCase`, `assert`, `failures` counter).

2. Add `"smoke:delegated-recovery": "node --experimental-strip-types scripts/smoke-delegated-recovery.ts"` to `package.json` scripts.

3. Test cases (7 total):

   - **implement failure recovers to blocked artifact**: skill `ticket-flow-delegated-handoff,ticket-implement`, error `"Forbidden validation command..."`. Expect: implementation artifact with `status: blocked`.
   - **validation failure recovers to blocked artifact**: skill `ticket-flow-delegated-handoff,ticket-test-fix`, error `"Delegated subagent cancelled."`. Expect: validation artifact with `status: blocked`.
   - **review failure recovers to revise artifact**: skill `ticket-flow-delegated-handoff,ticket-review`, error `"Delegated subagent cancelled."`. Expect: review artifact with `status: revise`.
   - **non-ticket-flow skill is not recovered**: skill `researcher`, error `"some error"`. Expect: returns `undefined`, no artifact written.
   - **existing valid artifact is preserved**: pre-write a valid implementation artifact. Expect: recovery returns summary but does NOT overwrite.
   - **existing malformed artifact is repaired**: pre-write a file that does not satisfy the contract. Expect: recovery rewrites it to a valid artifact.
   - **missing handoff.json means no recovery**: no handoff artifact exists. Expect: returns `undefined`.

4. Each test should use a temp directory for the artifact dir and clean up afterward.

## Acceptance criteria

- `npm run smoke:delegated-recovery` passes.
- All 7 test cases pass.
- All existing smoke tests still pass.

## ExecPlan Reference

- Plan: `.ticket-flow/plans/delegated-step-recovery/execplan.md`
- Milestone: M3 (Smoke tests for delegated recovery)
- Read these sections before implementing:
  - "Context and Orientation" for the recovery helper contract
  - Milestone 3 for this ticket's scope
  - "Interfaces and Dependencies" for the `DelegatedTicketFlowRecoveryInput` and `DelegatedTicketFlowRecoveryResult` types

## Scheduling Hints

- Kind: vertical-slice
- Depends on: ptf-gm5j (bridge recovery ticket — the recovery helper must exist to test it)
- Related to: ptf-gm5j
- Conflicts with: none
- Parallel-safe with: M4 (prompt/skill tightening)
- Suggested worktree isolation: optional


## Notes

**2026-04-14T08:10:18Z**

-m Gate: ESCALATE — implementation blocked (429 rate-limit error). Worker aborted before completing. Run token: 20260414T080656Z

**2026-04-14T08:12:50Z**

-m Gate: UNESCALATE — Ticket re-entered the ticket-flow pipeline. Previous escalation overridden. Review attempt counter preserved.

**2026-04-14T08:40:44Z**

Gate: ESCALATE — implementation blocked (429 rate-limit error). Delegated worker aborted before completion. Run token: 20260414T083828Z

**2026-04-14T10:47:27Z**

Gate: UNESCALATE — Ticket re-entered the ticket-flow pipeline. Previous escalation overridden. Review attempt counter preserved.

**2026-04-14T13:10:54Z**

-m Gate: REVISE (attempt 1) — Review found that synthesized validation/review artifacts are under-validated: the smoke suite checks status and step but never verifies the source_artifact field. Run token: 20260414T130254Z

**2026-04-14T13:20:59Z**

-m Gate: PASS — All 7 smoke tests pass including source_artifact verification for validation/review recovery. No regressions in existing suites. Run token: 20260414T131427Z
