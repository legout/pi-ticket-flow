---
id: ptf-gm5j
status: in_progress
deps: []
links: []
created: 2026-04-13T19:25:01Z
type: task
priority: high
assignee: legout
---
# Bridge recovery for delegated ticket-flow failures

## Goal

When a delegated ticket-flow step (implement, test-fix, or review) fails from a policy violation, crash, or timeout, the orchestrator state (`ticket-flow/state.json`) gets stranded in an active stage. The chain stops, finalization never runs, and the next `ticket-pick` refuses to proceed.

This ticket adds bridge-side recovery: after a delegated step aborts, the bridge synthesizes a fallback artifact (blocked or revise) and returns `isError: false` so the chain continues through finalization. The user never sees a stuck workflow again.

## Concrete steps

### Export artifact path helper (M1)

1. Edit `extensions/ticket-flow-tools.ts` — add `export` to the `artifactPaths` function (currently private, line 64).
2. No behavior change; the function already produces deterministic paths.

### Create recovery helper module (M2)

1. Create `extensions/ticket-flow-delegated-recovery.ts` with:

    export interface DelegatedTicketFlowRecoveryInput {
      artifactDir: string;
      skill?: string;
      errorText?: string;
    }
    export interface DelegatedTicketFlowRecoveryResult {
      summary: string;
      artifactPath: string;
    }
    export function recoverDelegatedTicketFlowFailure(
      input: DelegatedTicketFlowRecoveryInput,
    ): DelegatedTicketFlowRecoveryResult | undefined;

2. The helper should:
   - Read `ticket-flow/handoff.json` from the artifact directory on disk to extract `ticket` and `run_token`.
   - Import the exported `artifactPaths(ticket, runToken)` from `extensions/ticket-flow-tools.ts`.
   - Derive the expected artifact path for the current step.
   - If the artifact already exists and satisfies the finalize contract (correct `ticket:`, `step:`, `status:`, `source_artifact:`), keep it and return a recovery summary.
   - If the artifact is missing or malformed, synthesize a canonical one:
     - `ticket-implement` → `status: blocked`, `step: implement`, `source_artifact: none`
     - `ticket-test-fix` → `status: blocked`, `step: validate`, `source_artifact: <implementation path>`
     - `ticket-review` → `status: revise`, `step: review`, `source_artifact: <validation path>`
   - Return `undefined` for non-ticket-flow skills, missing handoff, or unreadable artifacts.

3. Artifact synthesis format follows the unified envelope contract (see plan).

### Hook recovery into bridge (M2)

1. Edit `extensions/prompt-template-interactive-bridge.ts`:
   - Import the recovery helper.
   - In `processSingleRequest()`, after `watchTask()` returns, check if `result.isError` is true.
   - If so, call `recoverDelegatedTicketFlowFailure({ artifactDir: getArtifactDir(ctx), skill: request.skill, errorText: result.errorText })`.
   - If recovery succeeds, build `finalResult` with `isError: false`, `errorText: undefined`, and `messages: ensureAssistantSummary([], recovered.summary)`.
   - If recovery returns `undefined`, preserve the original error.
   - Leave `processParallelRequest()` unchanged.

## Acceptance criteria

- `extensions/ticket-flow-tools.ts` exports `artifactPaths`.
- `extensions/ticket-flow-delegated-recovery.ts` exists and can preserve, repair, or synthesize artifacts.
- A forbidden validation command during `ticket-implement` results in a recovered blocked implementation artifact and a non-error delegated response.
- Non-ticket-flow delegated prompts still get `isError: true` on failure (unchanged).
- All existing smoke tests pass: `npm run smoke:bridge-message`, `npm run smoke:delegated-outcome`, `npm run smoke:delegated-retry`, `npm run smoke:delegated-policy`, `npm run smoke:model-selection`.

## ExecPlan Reference

- Plan: `.ticket-flow/plans/delegated-step-recovery/execplan.md`
- Milestone: M1 (Export shared artifact path derivation) + M2 (Bridge recovery on delegated ticket-flow failure)
- Read these sections before implementing:
  - "Context and Orientation" for repo layout and error propagation path
  - Milestones 1 and 2 for this ticket's scope
  - "Interfaces and Dependencies" for the recovery helper signature and bridge integration contract
  - "Decision Log" for why recovery lives in the bridge, why review recovers to revise, and why malformed artifacts are repaired

## Scheduling Hints

- Kind: vertical-slice
- Depends on: none
- Related to: smoke tests ticket (M3), prompt tightening ticket (M4)
- Conflicts with: none
- Parallel-safe with: M4 (prompt/skill tightening)
- Serialization points: `extensions/prompt-template-interactive-bridge.ts` is the shared serialization point for bridge changes
- Suggested worktree isolation: optional


## Notes

**2026-04-13T20:16:07Z**

Gate: REVISE — Recovery artifact preservation is too permissive: isArtifactValid() checks field presence but not exact contract values, so malformed artifacts with matching field names can be preserved instead of repaired. Review Attempt: 1/3.

**2026-04-13T20:43:59Z**

Gate: REVISE — isArtifactValid() still too permissive: scans every line so contract fields appearing in summary/evidence body cause false-positive preservation. Must parse only the header/contract block. Review Attempt: 2/3.
