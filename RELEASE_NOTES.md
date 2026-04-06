# Unreleased

## Review prompt redesign

- Replaced `/review` with a simple single-review prompt using the base `reviewer` agent
- Replaced `/review-deep` Best-of-N review with parallel review passes plus a final consolidation step
- Replaced `/ticket-review-deep` Best-of-N review with parallel ticket-review passes plus a final consolidation step that writes the canonical ticket review artifact
- Removed the obsolete internal `/review-single` alias and updated `/review-fix-chain` to use `/review` directly

# pi-ticket-flow v0.3.0

Prompt consolidation — fewer files, same functionality, better use of pi chain/loop features.

## Highlights

- Consolidated 24 prompts down to 19 by removing duplicates and merging queue-specific variants
- Simplified orchestrator prompts (`/plan`, `/plan-and-build`) to use `chain:` frontmatter instead of inlined multi-step instructions
- Merged `ticket-pick`/`ticket-queue-pick` and `ticket-finalize`/`ticket-queue-finalize` — the merged versions auto-detect queue context via `progress.md` existence
- Both `/ticket-flow` and `/ticket-queue` now share the exact same chain: `ticket-pick → ticket-implement → ticket-mark-review → ticket-review → ticket-finalize`

## Removed commands

These were duplicates or inlined copies of existing chains:

- `/ticket-flow-chain` — identical to `/ticket-flow`
- `/ticket-step` — identical to `/ticket-direct`
- `/ticket-direct` — inlined copy of the `/ticket-flow` chain
- `/ticket-queue-pick` — merged into `/ticket-pick`
- `/ticket-queue-finalize` — merged into `/ticket-finalize`

## Simplified commands

- `/plan` — now delegates to `/plan-chain` instead of inlining the architect/create/improve steps
- `/plan-and-build` — now a pure chain: `plan → ticketize → ticket-queue` (was 30 lines of procedural orchestration, now 7 lines)

## Commands (complete list)

### Planning
- `/ticket-flow-init` — scaffold project guidance files
- `/brainstorm <topic>` — interactive brainstorming
- `/architect <topic>` — create/update ARCHITECTURE.md
- `/plan <topic>` — full pipeline: brainstorm → plan-chain
- `/plan-chain <topic>` — chain: architect → plan-create → plan-improve
- `/plan-create <topic>` — create ExecPlan
- `/plan-improve <topic>` — deep-audit ExecPlan (loops up to 3×)
- `/ticketize <topic>` — ExecPlan → tk tickets
- `/plan-and-build <topic>` — chain: plan → ticketize → ticket-queue

### Execution
- `/ticket-flow` — chain: pick → implement → review → finalize (one ticket)
- `/ticket-queue` — chain with loop: pick → implement → review → finalize (until queue empty)
- `/ticket-reset` — clear stale orchestrator state
- `/bridge-smoke` — verify delegated execution works

### Maintenance
- `/update-architecture <topic>` — sync ARCHITECTURE.md post-implementation
