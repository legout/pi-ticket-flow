# Delegated Step Recovery

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `.ticket-flow/PLANS.md`.

## Purpose / Big Picture

After this change, a delegated ticket-flow step that crashes or hits a policy violation no longer strands the orchestrator. The chain continues through finalization, state is cleaned up, and the next `ticket-pick` is never blocked by stale `active` state.

The user sees the same `/ticket-flow` command. The observable difference: when a worker runs `pytest` during `ticket-implement`, the workflow no longer freezes. It gracefully records the failure, finalizes to ESCALATE or BLOCKED, writes the `state.json` tombstone, and the next invocation works normally.

## Progress

- [ ] Milestone 1: Export shared artifact path derivation
- [ ] Milestone 2: Bridge recovery on delegated ticket-flow failure
- [ ] Milestone 3: Smoke tests for delegated recovery
- [ ] Milestone 4: Prompt and skill tightening for delegated recovery

## Surprises & Discoveries

- none yet

## Decision Log

- Decision: Implement recovery in the bridge extension (`prompt-template-interactive-bridge.ts`) rather than in the chain consumer (`subagent-step.ts`).
  Rationale: The bridge is the layer that detects policy violations and aborts subagents. It has access to the session artifact directory and the request metadata (skill name). The chain consumer is vendored code in `vendor/pi-prompt-template-model/` that cannot easily be modified. The bridge is the right place to synthesize fallback artifacts and convert `isError: true` into `isError: false` with a recovered summary.
  Date/Author: 2026-04-13 / architect

- Decision: Keep the hard abort for policy violations rather than attempting session-file tool-result injection.
  Rationale: JSONL session files are output logs, not a live control channel. Appending a synthetic `toolResult` to a running subagent's session file would be brittle and race-prone. Instead, the bridge writes fallback artifacts *after* the abort and returns a clean non-error response. This is simpler, safer, and achieves the same goal: the chain continues.
  Date/Author: 2026-04-13 / architect

- Decision: Review failures recover to `status: revise` rather than `blocked`.
  Rationale: The finalize contract does not define a `blocked` review status. `revise` is the existing safe terminal status that causes finalize to leave the ticket `in_progress` and record a REVISE note. This avoids adding a new concept.
  Date/Author: 2026-04-13 / architect

- Decision: Only recover for ticket-flow delegated steps, not all delegated subagents.
  Rationale: The recovery logic needs to read `ticket-flow/handoff.json` and synthesize artifacts using the ticket-flow artifact path contract. Non-ticket-flow delegated subagents do not have these artifacts and should not be affected.
  Date/Author: 2026-04-13 / architect

- Decision: Keep the bridge focused on orchestration and put ticket-flow recovery policy in `extensions/ticket-flow-delegated-recovery.ts`.
  Rationale: The bridge already owns task lifecycle and response emission; the repair rules are easier to test and reason about when isolated behind a small helper module that the bridge calls.
  Date/Author: 2026-04-13 / architect

- Decision: Treat a file as recoverable only when it matches the expected artifact contract, not merely because a path exists.
  Rationale: `ticket-finalize.md` parses the evidence artifacts strictly. Reusing a malformed file would just defer the failure. Repairing malformed or missing artifacts keeps the workflow moving without trusting broken markdown.
  Date/Author: 2026-04-13 / architect

- Decision: Add a dedicated `smoke:delegated-recovery` npm script for the new recovery suite.
  Rationale: The repository already exposes smoke checks through npm scripts, so the new recovery suite should follow the same convention and be runnable alongside the existing smoke commands.
  Date/Author: 2026-04-13 / architect

## Outcomes & Retrospective

- to be filled as milestones are completed

## Context and Orientation

### The problem

When a delegated ticket-flow step (implement, test-fix, or review) fails — either from a policy violation, a crash, or a timeout — the orchestrator state (`ticket-flow/state.json`) gets stranded in an active stage (`implementing`, `validating`, or `reviewing`). The chain stops because:

1. The bridge (`prompt-template-interactive-bridge.ts`) detects the policy violation in `watchTask()` and calls `task.abortController.abort()`.
2. `watchTask()` returns `TaskResult` with `isError: true`.
3. `processSingleRequest()` copies that into `DelegatedSubagentResponse` with `isError: true`.
4. `subagent-step.ts` (line ~744) throws: `"Delegated prompt execution failed: Forbidden validation command..."`.
5. The chain stops. `ticket-finalize` never runs. `state.json` stays active.
6. The next `ticket-pick` sees `stage != "done"` and refuses to proceed.

The only recovery today is manual: the user must run `/ticket-reset` to clear the stuck state.

### Complexity today

- **Change amplification**: A single policy violation in `ticket-implement` blocks the entire workflow. The user must manually diagnose, reset, and re-run.
- **Cognitive load**: The user must understand the internal state model to diagnose why `/ticket-flow` stopped working.
- **Unknown unknowns**: A stuck `state.json` is not immediately visible. The user might try `/ticket-flow` multiple times before realizing the state is corrupted.

### What becomes simpler after this change

- The bridge owns failure recovery for ticket-flow steps. Callers don't need to know about the possibility of incomplete artifacts.
- The chain always terminates: pick → implement → test-fix → review → finalize runs to completion regardless of individual step failures.
- `state.json` always ends at `stage: "done"`. The stale-state problem disappears.
- No new concepts are introduced. The existing artifact contract (`status: blocked`, `status: revise`) is reused.

### Error propagation path (current)

```
watchTask()
  → abortOnPolicyViolation() calls task.abortController.abort()
  → catch block returns { isError: true, errorText: "Forbidden validation command..." }
processSingleRequest()
  → copies result into DelegatedSubagentResponse { isError: true }
  → emits RESPONSE_EVENT
subagent-step.ts :: requestDelegatedRun()
  → onResponse handler resolves with response
  → executeSubagentPromptStep sees response.isError → throws
  → chain stops, ticket-finalize never runs
```

### Error propagation path (after this change)

```
watchTask()
  → abortOnPolicyViolation() calls task.abortController.abort()
  → catch block returns { isError: true, errorText: "Forbidden validation command..." }
processSingleRequest()
  → detects ticket-flow skill in request
  → reads handoff.json from session artifacts
  → synthesizes blocked/revise artifact
  → converts response to { isError: false } with recovered summary
  → emits RESPONSE_EVENT
subagent-step.ts :: requestDelegatedRun()
  → response.isError is false → proceeds normally
  → chain continues to next step → finalize runs
```

### Relevant files

```
extensions/
├── prompt-template-interactive-bridge.ts   # Bridge: launch, watch, recover
├── ticket-flow-delegated-recovery.ts       # New recovery policy helper
├── delegated-execution-policy.ts           # Policy detection (unchanged)
├── delegated-subagent-outcome.ts           # Outcome summarization (unchanged)
├── ticket-flow-tools.ts                    # Artifact path derivation (export needed)
├── bridge-message-utils.ts                 # Message extraction helpers
├── interactive-session-artifacts.ts        # Artifact dir resolution
vendor/pi-prompt-template-model/
├── subagent-step.ts                        # Chain consumer (unchanged, vendored)
skills/
├── ticket-flow/SKILL.md                   # Main orchestrator contract
├── ticket-implement/SKILL.md             # Prompt tightening
├── ticket-test-fix/SKILL.md              # Prompt tightening
├── ticket-review/SKILL.md                # Prompt tightening
scripts/
├── smoke-delegated-policy.ts               # Existing policy tests
├── smoke-delegated-subagent-outcome.ts     # Existing outcome tests (script: smoke:delegated-outcome)
├── smoke-delegated-retry.ts                # Existing retry tests
├── smoke-delegated-recovery.ts             # New recovery tests and script
package.json                                # Add smoke:delegated-recovery command
prompts/
├── ticket-finalize.md                      # Finalize must treat recovered artifacts as authoritative
```

## Plan of Work

Four milestones. Dependencies:

- M1 is an enabler (exports a shared function) — M2 depends on it.
- M2 is the core recovery logic — M3 depends on it.
- M3 validates M2 — M4 is independent.
- M4 (prompt and skill tightening) is independent and can proceed in parallel with M1–M3.

### Milestone 1: Export shared artifact path derivation

**Type: enabler**

Today `artifactPaths(ticket, runToken)` is a private function in `extensions/ticket-flow-tools.ts`. The recovery code in M2 needs the same function to derive where fallback artifacts should be written, and the smoke tests should exercise the same deterministic path contract.

**What changes:**
- Export `artifactPaths` from `extensions/ticket-flow-tools.ts`.
- No behavior change. The function already produces deterministic paths.

**Why an enabler milestone:** The function is tiny, but keeping the path contract in one place prevents the recovery logic from drifting away from the tool surface. If the bridge and the tools disagree about artifact paths, finalization will look in the wrong place and the chain will still fail.

**Verification:** `npm run smoke:delegated-policy` still passes. The export is a non-breaking change since nothing currently imports from this module externally.

### Milestone 2: Bridge recovery on delegated ticket-flow failure

**Type: vertical slice — delivers observable behavior**

This is the core change. When a delegated ticket-flow step fails, the bridge uses a small recovery helper to decide whether there is already a valid artifact, whether the artifact needs to be repaired, or whether it should synthesize the missing file. It then returns `isError: false` so the chain continues.

**What changes in `extensions/ticket-flow-delegated-recovery.ts`:**

Add a small recovery helper that the bridge calls. The helper should:
- accept the delegated skill string, the failure text, and the artifact directory for the current session;
- read `ticket-flow/handoff.json` from the session artifact directory on disk;
- derive artifact paths using the exported `artifactPaths` helper;
- validate any existing artifact against the same contract that `ticket-finalize.md` expects;
- keep an existing valid artifact unchanged;
- repair a malformed or missing artifact by writing the canonical markdown for the current step;
- return the artifact path and a recovery summary string when it succeeds, or `undefined` when the error should still propagate.

The helper should treat these cases as valid recovery targets:
- `implement` → `status: blocked`, `step: implement`, `source_artifact: none`
- `validate` → `status: blocked`, `step: validate`, `source_artifact: <implementation path>`
- `review` → `status: revise`, `step: review`, `source_artifact: <validation path>`

**What changes in `extensions/prompt-template-interactive-bridge.ts`:**

1. Import the recovery helper and call it from `processSingleRequest()` after `watchTask()` returns.
2. Only attempt recovery when `result.isError` is true and `request.skill` contains one of the ticket-flow delegated skills.
3. Keep the existing abort behavior inside `watchTask()`; recovery happens after the abort, before the response is emitted to `subagent-step.ts`.
4. Build the final `DelegatedSubagentResponse` from the recovered result when the helper succeeds; otherwise preserve the original error.
5. Leave `processParallelRequest()` unchanged. The current ticket-flow chain uses single delegated steps, and parallel recovery would be a separate policy decision because the bridge aggregates parallel failures differently.

**Artifact synthesis format:**

For implementation:
```markdown
# Implementation Result

ticket: <ticket-id>
step: implement
status: blocked
source_artifact: none

## Summary

Delegated implementation step failed and was recovered by the orchestrator bridge.

## Files Changed

none — step did not complete

## Evidence

Recovery artifact: the delegated worker was aborted before writing its own artifact.
Reason: <error text>

## Remaining Issues

<error text>
```

For validation:
```markdown
# Validation Result

ticket: <ticket-id>
step: validate
status: blocked
source_artifact: <implementation artifact path>

## Summary

Delegated validation step failed and was recovered by the orchestrator bridge.

## Files Changed

none — step did not complete

## Evidence

Recovery artifact: the delegated worker was aborted before writing its own artifact.
Reason: <error text>

## Remaining Issues

<error text>
```

For review:
```markdown
# Review Result

ticket: <ticket-id>
step: review
status: revise
source_artifact: <validation artifact path>

## Summary

Delegated review step failed and was recovered by the orchestrator bridge.

## Files Changed

none — step did not complete

## Evidence

Recovery artifact: the delegated reviewer was aborted before writing its own artifact.
Reason: <error text>

## Remaining Issues

<error text>
```

**Why review recovers to `revise` instead of `blocked`:** The finalize prompt understands `status: revise` for review artifacts and will leave the ticket `in_progress`. There is no separate review-time `blocked` status in the current contract.

**Artifact reuse rule:** If the expected artifact already exists and satisfies the contract, the helper must keep it and return a recovery summary without overwriting it. If the file exists but is malformed or incomplete, the helper should repair it with the canonical contract rather than passing a broken artifact downstream, because finalization will reject malformed markdown later.

**Verification:**
- Existing smoke tests still pass: `npm run smoke:delegated-policy`, `npm run smoke:delegated-outcome`, `npm run smoke:delegated-retry`, `npm run smoke:bridge-message`, `npm run smoke:model-selection`.
- The new recovery smoke suite passes after M3.

### Milestone 3: Smoke tests for delegated recovery

**Type: vertical slice — validates M2**

Add a new smoke test file `scripts/smoke-delegated-recovery.ts` and a matching `npm` script so the recovery policy is exercised the same way as the other smoke suites.

**Package script:**
- Add `"smoke:delegated-recovery": "node --experimental-strip-types scripts/smoke-delegated-recovery.ts"` to `package.json`.

**Test cases:**

1. **implement failure recovers to blocked artifact:**
   - Input: skill `ticket-flow-delegated-handoff,ticket-implement`, error text `"Forbidden validation command during implementation step: python -m pytest ..."`
   - Expect: implementation artifact written with `status: blocked`
   - Expect: recovery summary returned

2. **validation failure recovers to blocked artifact:**
   - Input: skill `ticket-flow-delegated-handoff,ticket-test-fix`, error text `"Delegated subagent cancelled."`
   - Expect: validation artifact written with `status: blocked`
   - Expect: the existing `ticket-review` guard skips review and finalization can escalate from the blocked validation artifact

3. **review failure recovers to revise artifact:**
   - Input: skill `ticket-flow-delegated-handoff,ticket-review`, error text `"Delegated subagent cancelled."`
   - Expect: review artifact written with `status: revise`

4. **non-ticket-flow skill is not recovered:**
   - Input: skill `researcher`, error text `"some error"`
   - Expect: no recovery (returns undefined)
   - Expect: no artifact written

5. **existing valid artifact is preserved:**
   - Input: skill `ticket-implement`, with an already-valid implementation artifact at the expected path
   - Expect: recovery returns summary and does not overwrite the artifact
   - Verify the artifact content is unchanged

6. **existing malformed artifact is repaired:**
   - Input: skill `ticket-implement`, with a file at the expected path that does not satisfy the contract
   - Expect: recovery rewrites it into a valid implementation artifact that finalize can parse

7. **missing handoff.json means no recovery:**
   - Input: skill `ticket-implement`, but no `handoff.json` artifact exists
   - Expect: no recovery (returns undefined)

**Verification:** `npm run smoke:delegated-recovery` passes.

### Milestone 4: Prompt and skill tightening for delegated recovery

**Type: cleanup — reduces frequency of violations**

Update the main orchestrator skill and the three delegated skills so the recovery behavior is documented where the workflow rules already live:

- `skills/ticket-flow/SKILL.md` — add a short note in the finalization and artifact-contract sections that bridge-side recovery may synthesize blocked or revise artifacts after delegated failure, and that `ticket-finalize` treats those artifacts as authoritative evidence.
- `skills/ticket-implement/SKILL.md` — add a rule noting that policy-blocked validation commands may trigger a recovered blocked implementation artifact.
- `skills/ticket-test-fix/SKILL.md` — add a rule noting that unexpected delegated failure may yield a recovered blocked validation artifact.
- `skills/ticket-review/SKILL.md` — add a rule noting that unexpected delegated failure may yield a recovered revise review artifact.
- `prompts/ticket-finalize.md` — add a note near the state/artifact checks that recovered artifacts are still authoritative and should be processed exactly like artifacts written directly by the delegated worker.

**Verification:** This is documentation-only. All smoke tests still pass.

## Concrete Steps

Work from the repository root: `/Users/volker/coding/libs/pi-ticket-flow`.

### M1 — Export shared artifact path derivation

Edit `extensions/ticket-flow-tools.ts` and export `artifactPaths`.

Run:

    cd /Users/volker/coding/libs/pi-ticket-flow
    npm run smoke:delegated-policy

Expect the existing delegated policy smoke checks to still print `All delegated policy smoke checks passed.`

### M2 — Bridge recovery

Create `extensions/ticket-flow-delegated-recovery.ts` and then update `extensions/prompt-template-interactive-bridge.ts` to call it from `processSingleRequest()`.

Use the same artifact naming contract that `ticket_flow_artifact_paths` already exposes, and read the handoff artifact from the session artifact directory instead of from shared machine state.

Run:

    cd /Users/volker/coding/libs/pi-ticket-flow
    npm run smoke:bridge-message
    npm run smoke:delegated-outcome
    npm run smoke:delegated-retry
    npm run smoke:delegated-policy
    npm run smoke:model-selection

Expect the existing suites to remain green.

### M3 — Recovery smoke tests

Create `scripts/smoke-delegated-recovery.ts` and add the matching `smoke:delegated-recovery` script to `package.json`.

Run:

    cd /Users/volker/coding/libs/pi-ticket-flow
    npm run smoke:delegated-recovery

Expect the recovery suite to print `All delegated recovery smoke checks passed.`

### M4 — Prompt and skill tightening

Update `skills/ticket-flow/SKILL.md`, `skills/ticket-implement/SKILL.md`, `skills/ticket-test-fix/SKILL.md`, `skills/ticket-review/SKILL.md`, and `prompts/ticket-finalize.md`.

Run:

    cd /Users/volker/coding/libs/pi-ticket-flow
    npm run smoke:bridge-message
    npm run smoke:delegated-outcome
    npm run smoke:delegated-retry
    npm run smoke:delegated-policy
    npm run smoke:delegated-recovery
    npm run smoke:model-selection

Expect all smoke suites to pass.

## Validation and Acceptance

This change is successful when a single bad delegated command no longer strands the workflow.

A concrete end-to-end check:

1. Start a ticket-flow invocation for a ticket whose worker hits the forbidden validation command during `ticket-implement`.
2. Observe that the bridge writes a blocked implementation artifact instead of leaving the chain in a half-finished state.
3. Observe that `ticket-test-fix` and `ticket-review` either consume the blocked state correctly or stop because the upstream stage is blocked, and that `ticket-finalize` writes the `state.json` tombstone.
4. Run the same flow again and confirm that `ticket-pick` is no longer blocked by stale `active` state.

Acceptance criteria:

- `extensions/ticket-flow-tools.ts` exports the path helper used by both the tool surface and recovery code.
- `extensions/ticket-flow-delegated-recovery.ts` can preserve an already-valid artifact, repair a malformed artifact, or synthesize a missing one.
- A forbidden validation command during `ticket-implement` results in a recovered blocked implementation artifact and a non-error delegated response.
- A delegated validation crash results in a recovered blocked validation artifact.
- A delegated review crash results in a recovered revise review artifact.
- Non-ticket-flow delegated prompts still behave exactly as they do today.
- Existing smoke tests stay green, and `npm run smoke:delegated-recovery` passes.
- `ticket-flow/state.json` still ends at `stage: "done"` after finalization.

## Idempotence and Recovery

Each milestone can be committed independently. M1 is a trivial export. M2 is additive and leaves the original error propagation path intact for non-ticket-flow delegated prompts. M3 is test-only. M4 is documentation-only.

If M2 causes a regression, the recovery branch can be disabled by removing the `if (result.isError)` check in `processSingleRequest()`. The original behavior is still present. If a recovery artifact is malformed during testing, the new smoke suite should fail and point at the contract mismatch instead of silently accepting it.

The recovery helper is defensive: it returns `undefined` for any case it cannot handle (missing handoff, non-ticket-flow skill, unreadable artifacts), and the original error propagates as before.

## Artifacts and Notes

### New files

- `extensions/ticket-flow-delegated-recovery.ts` — recovery policy helper that can be unit-tested without launching a subagent
- `scripts/smoke-delegated-recovery.ts` — smoke suite covering recovery and artifact repair behavior

### Modified files

- `extensions/ticket-flow-tools.ts` — export `artifactPaths`
- `extensions/prompt-template-interactive-bridge.ts` — call recovery helper from `processSingleRequest()`
- `package.json` — add `smoke:delegated-recovery`
- `skills/ticket-flow/SKILL.md` — document recovered artifacts as authoritative workflow inputs
- `skills/ticket-implement/SKILL.md` — document blocked-implementation recovery
- `skills/ticket-test-fix/SKILL.md` — document blocked-validation recovery
- `skills/ticket-review/SKILL.md` — document revise recovery
- `prompts/ticket-finalize.md` — document that recovered artifacts are finalization inputs

### Expected net change

- ~1 small shared export
- ~1 new recovery helper module
- ~1 new smoke script and package command
- ~6 short documentation updates
- ~0 changes to the workflow's user-visible intent

### Interfaces

**Recovery helper signature:**
```ts
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
```

The helper should import the exported `artifactPaths(ticket, runToken)` function from `extensions/ticket-flow-tools.ts`, read `ticket-flow/handoff.json` from the session artifact directory on disk, and write or preserve the expected evidence artifact at the derived path.

**Bridge integration:**
`processSingleRequest()` in `extensions/prompt-template-interactive-bridge.ts` should remain the only place that decides whether a generic delegated error is eligible for ticket-flow recovery. The helper should only deal with ticket-flow-specific recovery rules.

### Revision note

Updated this ExecPlan to correct file names and commands, add an explicit recovery helper boundary, add the recovery smoke script/package command, and tighten the recovery semantics so existing valid artifacts are preserved while malformed ones are repaired instead of being trusted blindly. These changes make the plan more accurate, testable, and consistent with the repository's existing smoke-test and module boundaries.
