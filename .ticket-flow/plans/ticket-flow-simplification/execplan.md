# Ticket-Flow Simplification

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

After this change, the ticket-flow workflow uses one state file instead of two, passes handoff data through an artifact instead of an in-band string, uses a single artifact schema across all three steps, and has fewer than half as many prompt files. The user sees the same `/ticket-flow` command work the same way — but the internals are dramatically simpler, which means fewer bugs, faster debugging, and less prompt-engineering overhead when something goes wrong.

The observable behavior after each milestone: running the existing smoke tests (`npm run smoke:*`) still passes, and a manual `/ticket-flow` invocation on a real ticket still selects, implements, validates, reviews, and finalizes correctly.

## Progress

- [ ] Milestone 1: Delete deprecated prompts (ticket-mark-validation, ticket-mark-review)
- [ ] Milestone 2: Collapse dual state into single `ticket-flow/state.json`
- [ ] Milestone 3: Move handoff from in-band string to `ticket-flow/handoff.json` artifact
- [ ] Milestone 4: Merge ticket-pick ceremony into tool-driven flow
- [ ] Milestone 5: Unify the three artifact schemas into one envelope
- [ ] Milestone 6: Remove the deep-review parallel chain
- [ ] Milestone 7: Simplify ticket-finalize to match the new simpler state model

## Surprises & Discoveries

- none yet

## Decision Log

- Decision: Treat all 7 simplifications as milestones in one plan rather than 7 separate plans.
  Rationale: They share a codebase, have real dependencies (milestone 2 must precede 3 and 7, milestone 3 must precede 4), and producing 7 separate ExecPlans with duplicated Context sections would add hundreds of lines of overhead without adding clarity.
  Date/Author: 2026-04-10 / architect

- Decision: Write the plan so that each milestone is independently verifiable and deployable.
  Rationale: Even within one plan, each milestone should produce a working state that can be committed, tested, and released on its own. This avoids big-bang risk and lets the user stop after any milestone.
  Date/Author: 2026-04-10 / architect

- Decision: Use the PLANS.md spec embedded in prompts/ticket-flow-init.md as the authoring contract since no `.ticket-flow/PLANS.md` file exists yet in this repo.
  Rationale: The init prompt contains the canonical PLANS.md content. The repo itself is the pi-ticket-flow package, not a consumer project, so it has not been initialized with `/ticket-flow-init`.
  Date/Author: 2026-04-10 / architect

## Outcomes & Retrospective

- to be filled as milestones are completed

## Context and Orientation

This is the `pi-ticket-flow` npm package — a pi (coding agent) extension that provides delegated ticket-workflow commands. The package lives at the repository root. There is no `.ticket-flow/` directory yet because this package *provides* the ticket-flow tooling; it does not consume itself.

### Directory layout (relevant files only)

    pi-ticket-flow/
    ├── agents/                          # Subagent definitions (3 files)
    │   ├── change-planner.md
    │   ├── researcher.md
    │   └── ticket-smoke.md
    ├── extensions/                      # pi extension entry points (TS)
    │   ├── ticket-flow-tools.ts         # 4 deterministic helper tools
    │   ├── register-ticket-agents.ts    # Installs agent .md files
    │   ├── delegated-execution-policy.ts
    │   ├── delegated-subagent-outcome.ts
    │   ├── bridge-message-utils.ts
    │   ├── interactive-session-artifacts.ts
    │   ├── interactive-subagents-detection.ts
    │   ├── interactive-subagents-tools.ts
    │   ├── prompt-template-interactive-bridge.ts  # 888 lines
    │   └── subagent-runtime/
    ├── prompts/                         # pi prompt templates (41 files)
    │   ├── ticket-flow.md              # Chain: pick → implement → test-fix → review → finalize
    │   ├── ticket-queue.md             # Same chain with loop/fresh/converge
    │   ├── ticket-pick.md              # 172-line selection procedure
    │   ├── ticket-implement.md         # Delegates to worker
    │   ├── ticket-test-fix.md          # Delegates to worker
    │   ├── ticket-review.md            # Delegates to reviewer
    │   ├── ticket-finalize.md          # 127-line, 35-step finalization procedure
    │   ├── ticket-reset.md             # Resets orchestrator state
    │   ├── ticket-flow-init.md         # Scaffolds .ticket-flow/ in target repos
    │   ├── ticket-mark-validation.md   # DEPRECATED — prints "deprecated", CHAIN_STOPs
    │   ├── ticket-mark-review.md       # DEPRECATED — prints "deprecated", CHAIN_STOPs
    │   ├── ticket-review-deep.md       # 7-line chain def for parallel deep review
    │   ├── ticket-review-deep-handoff.md
    │   ├── ticket-review-deep-correctness.md
    │   ├── ticket-review-deep-regression.md
    │   ├── ticket-review-deep-tests.md
    │   └── ticket-review-deep-consolidate.md
    ├── skills/                          # pi skill definitions (17 directories)
    │   ├── ticket-flow/SKILL.md        # 203 lines — master orchestrator skill
    │   ├── ticket-flow-delegated-handoff/SKILL.md  # 63 lines — shared handoff contract
    │   ├── ticket-implement/SKILL.md   # 108 lines — implementation skill
    │   ├── ticket-test-fix/SKILL.md    # 133 lines — validation/fix skill
    │   └── ticket-review/SKILL.md      # 118 lines — review skill
    ├── scripts/
    │   ├── ticket-flow-helper.mjs      # 201-line CLI duplicating ticket-flow-tools.ts logic
    │   └── smoke-*.ts                  # 5 smoke test scripts
    ├── docs/                            # Diátaxis-style documentation
    ├── python/                          # Python bindings
    ├── vendor/                          # Vendored pi-prompt-template-model
    ├── package.json
    ├── README.md
    └── RELEASE_NOTES.md

### Current state model (what we are simplifying away)

The orchestrator maintains two JSON session artifacts:

1. `ticket-flow/invocation.json` — per-invocation guard with status `armed | blocked`, ticket identity, run token, mode
2. `ticket-flow/current.json` — lightweight marker with stage `active | done`

Delegated steps (implement, test-fix, review) must NOT read these files. Instead they parse an in-band string (`Selection handoff JSON: {...}`) from chain context that ticket-pick emits in its final assistant message.

This creates three complexity vectors:
- Dual-state consistency bugs (invocation says armed but current says done, or vice versa)
- Fragile in-band parsing (if the summarizer truncates the handoff line, the chain breaks)
- 35-step finalization procedure mostly spent guarding against state disagreements

### Artifact contracts (what we are unifying)

Three separate artifact schemas flow between steps:

    Implementation artifact:
      ticket: <id>
      status: ready-for-validation | blocked

    Validation artifact:
      ticket: <id>
      status: ready-for-review | blocked
      source_implementation_artifact: <path>

    Review artifact:
      ticket: <id>
      gate: PASS | REVISE

Each skill has its own ~25-line artifact contract section. Finalize must parse three different formats.

### Tool surface (extensions/ticket-flow-tools.ts)

Four deterministic helper tools are registered as pi tools:

- `ticket_flow_new_run_token` — generates a UTC timestamp like `20260410T165200Z`
- `ticket_flow_artifact_paths` — derives `{implementation, validation, review}` paths from ticket + run_token
- `ticket_flow_check_ticket` — inspects a ticket for eligibility (leaf, deps, escalation)
- `ticket_flow_select` — selects the next eligible ticket from `tk ready`

Additionally, `scripts/ticket-flow-helper.mjs` duplicates all this logic as a standalone CLI for use outside pi tool calls.

## Plan of Work

The work proceeds in seven milestones. The dependency order is:

    M1 (delete deprecated)          — independent, no prerequisites
    M2 (single state file)          — independent, no prerequisites
    M3 (artifact-based handoff)     — depends on M2
    M4 (tool-driven ticket-pick)    — depends on M3
    M5 (unified artifact schema)    — depends on M2 (uses new state file)
    M6 (remove deep-review chain)   — independent, no prerequisites
    M7 (simplify finalize)          — depends on M2, M3, M5

M1 and M6 can be done in parallel with M2. M3 and M5 can proceed in parallel once M2 is done. M4 depends on M3. M7 is the capstone that benefits from everything before it.

### Milestone 1: Delete deprecated prompts

This is a cleanup enabler. Two prompt files exist solely to print "this is deprecated" and emit `<!-- CHAIN_STOP -->`. They consume a model call to do nothing useful. Deleting them removes dead weight and reduces the prompt inventory from 41 to 39 files.

The ticket-flow SKILL.md already documents both as deprecated. No prompt or skill references them in a chain. The chain definition in `prompts/ticket-flow.md` uses the simplified chain (pick → implement → test-fix → review → finalize) and does not include mark-validation or mark-review steps.

### Milestone 2: Collapse dual state into single `ticket-flow/state.json`

This is the foundational simplification. Today the orchestrator writes two JSON files that must stay in sync: `invocation.json` (armed/blocked, ticket identity) and `current.json` (active/done). The new model collapses these into one file with richer stage information:

    {
      "version": 3,
      "ticket": "flo-1234" | null,
      "ticket_path": ".tickets/flo-1234.md" | null,
      "run_token": "20260410T165200Z" | null,
      "mode": "single" | "queue",
      "stage": "selecting" | "implementing" | "validating" | "reviewing" | "done",
      "reason": "..."
    }

The stage names correspond to which step the orchestrator is currently running. `selecting` means ticket-pick is running (or about to run). `done` is the tombstone state. All the information from both old files is present in one file.

Changes required:
- `skills/ticket-flow/SKILL.md` — replace the dual-state documentation with the single-state model
- `prompts/ticket-pick.md` — write `state.json` instead of `invocation.json` + `current.json`; remove steps 5, 8, 21-22 (sentinel writes) and consolidate into one write
- `prompts/ticket-finalize.md` — read `state.json` instead of two files; remove the advisory-only logic for current.json
- `prompts/ticket-reset.md` — write `state.json` tombstone instead of two files; keep legacy markdown cleanup
- `prompts/ticket-flow-init.md` — update the artifact location listing to show `state.json` instead of two files
- `extensions/ticket-flow-tools.ts` — no tool changes needed (tools don't read state files)
- `scripts/ticket-flow-helper.mjs` — no changes needed (CLI doesn't manage state)

For backward compatibility, the code should tolerate old `invocation.json` + `current.json` artifacts and tell the user to run `/ticket-reset` to migrate (the same pattern already used for legacy markdown state).

### Milestone 3: Move handoff from in-band string to `ticket-flow/handoff.json` artifact

Today, `ticket-pick` emits `Selection handoff JSON: {...}` as text in its final assistant message. Downstream delegated steps parse the "most recent" occurrence of this marker from chain context. This is fragile — if the chain-context summarizer truncates the line, the chain breaks silently.

The fix: `ticket-pick` writes the handoff as a session artifact (`ticket-flow/handoff.json`) and downstream steps read it with `read_artifact`. The handoff JSON content stays the same; only the transport changes.

Changes required:
- `skills/ticket-flow-delegated-handoff/SKILL.md` — replace "look for the most recent exact marker" with "read `ticket-flow/handoff.json` via `read_artifact`". The 63-line skill shrinks dramatically.
- `prompts/ticket-pick.md` — instead of emitting the handoff string in the final assistant message, write `ticket-flow/handoff.json` via `write_artifact`. The handoff JSON is the same shape: `{ticket, ticket_path, mode, run_token}`.
- `skills/ticket-implement/SKILL.md` — update step 1 to read handoff from artifact instead of parsing chain context
- `skills/ticket-test-fix/SKILL.md` — same
- `skills/ticket-review/SKILL.md` — same
- `prompts/ticket-review-deep-handoff.md` — if it still exists (depends on M6 ordering), update to read from artifact. If M6 is done first, this file is gone.

The skill `ticket-flow-delegated-handoff` can potentially be merged into `ticket-flow/SKILL.md` since it shrinks from 63 lines to roughly 15 lines of "read handoff.json, extract four keys."

### Milestone 4: Merge ticket-pick ceremony into tool-driven flow

Today `ticket-pick.md` is 172 lines of procedural instructions. The deterministic `ticket_flow_select` tool already does the heavy lifting. But the prompt still has ~20 steps of ceremony around sentinel writes, legacy checks, queue initialization, etc.

After M2 (single state) and M3 (artifact handoff), most of that ceremony evaporates. What remains:
1. Read `state.json`; if it exists and stage is not `done`, stop.
2. Call `ticket_flow_select`.
3. If no ticket selected, write `state.json` with `stage: "done"` and stop.
4. Call `ticket_flow_new_run_token`.
5. Run `tk start <ticket>` if needed.
6. Write `state.json` with `stage: "implementing"`, ticket identity, run token.
7. Write `ticket-flow/handoff.json` with the handoff data.
8. In queue mode, initialize progress.md and lessons-learned.md if missing.

That is roughly 40 lines instead of 172. The prompt becomes a thin wrapper around the tool calls.

Additionally, consider adding a new `ticket_flow_arm` tool that wraps steps 5-7 (start ticket if needed, generate run token, return the armed state). This would make the prompt even thinner and ensure the state-writing logic is deterministic code rather than prompt instructions. However, this is optional — the main simplification comes from the state and handoff changes.

Changes required:
- `prompts/ticket-pick.md` — rewrite from 172 lines to ~40 lines
- Optionally `extensions/ticket-flow-tools.ts` — add a `ticket_flow_arm` tool

### Milestone 5: Unify the three artifact schemas into one envelope

Today, implementation, validation, and review artifacts each use a different format with different contract keys. Finalize must parse three different schemas. Each skill has its own ~25-line artifact contract section.

The unified envelope:

    # <Step> Result

    ticket: <ticket-id>
    step: implement | validate | review
    status: ready-for-validation | ready-for-review | blocked | pass | revise
    source_artifact: <path of previous step's artifact, or none>

    ## Summary
    ...

    ## Files Changed
    ...

    ## Evidence
    ...

    ## Remaining Issues
    ...

Key differences from today:
- `step` replaces the implicit step identity (today you must look at which artifact path you're reading)
- `status` uses one vocabulary instead of three (`ready-for-validation`, `ready-for-review`, `blocked`, `pass`, `revise`)
- `source_artifact` replaces `source_implementation_artifact` (a generic back-link)
- `gate: PASS | REVISE` in the review artifact becomes `status: pass | revise` (one concept instead of two)
- The evidence section is renamed from `Validation Evidence` to just `Evidence`

Changes required:
- `skills/ticket-implement/SKILL.md` — update artifact contract section to use unified schema
- `skills/ticket-test-fix/SKILL.md` — same
- `skills/ticket-review/SKILL.md` — same; `gate: PASS` becomes `status: pass`
- `prompts/ticket-finalize.md` — parse one schema instead of three
- `prompts/ticket-implement.md` — update to reference new artifact format
- `prompts/ticket-test-fix.md` — same
- `prompts/ticket-review.md` — same

### Milestone 6: Remove the deep-review parallel chain

The deep review system consists of 6 prompt files totaling 259 lines plus an orchestration chain that runs 3 parallel review passes and then consolidates them. The handoff step re-reads state and re-emits the handoff string — duplicating what ticket-pick already did. The value over a single-pass review is marginal for most tickets.

The simplification: delete the 6 `ticket-review-deep-*.md` files and remove the deep review chain. If deep review is wanted in the future, it can be rebuilt as a `depth: deep` frontmatter option on `ticket-review.md` that instructs the reviewer to run multiple lenses within one session — no parallel subagents needed.

Changes required:
- Delete `prompts/ticket-review-deep.md`
- Delete `prompts/ticket-review-deep-handoff.md`
- Delete `prompts/ticket-review-deep-correctness.md`
- Delete `prompts/ticket-review-deep-regression.md`
- Delete `prompts/ticket-review-deep-tests.md`
- Delete `prompts/ticket-review-deep-consolidate.md`
- Update `skills/ticket-flow/SKILL.md` if it references the deep review chain
- Update `README.md` if it documents deep review commands

### Milestone 7: Simplify ticket-finalize

This is the capstone. After M2 (single state), M3 (artifact handoff), and M5 (unified artifacts), the finalization procedure collapses from 35 steps to roughly 10:

1. Read `ticket-flow/state.json` via `read_artifact`. Verify `stage` is not `done`.
2. Derive artifact paths from `ticket` + `run_token` using `ticket_flow_artifact_paths`.
3. Read the implementation artifact. If missing or `status: blocked`, escalate.
4. Read the validation artifact. If missing or `status: blocked`, escalate.
5. Read the review artifact. If missing, stop.
6. Count prior `Gate: REVISE` notes via `tk show <ticket>`.
7. If `status: pass`, add PASS note and close ticket.
8. If `status: revise` and attempt ≤ 2, add REVISE note, leave in progress.
9. If `status: revise` and attempt 3, escalate.
10. Write `state.json` with `stage: "done"`. Update queue progress if in queue mode.

The prompt shrinks from 127 lines to roughly 50 lines. Most of the removed steps are the dual-state consistency checks, advisory-only current.json handling, and three different artifact parsing routines.

Changes required:
- `prompts/ticket-finalize.md` — rewrite to the simplified procedure
- Verify `skills/ticket-flow/SKILL.md` finalization model section matches

## Concrete Steps

All commands are run from the repository root (`pi-ticket-flow/`).

### M1 — Delete deprecated prompts

    # Verify nothing references these prompts in a chain
    grep -r "ticket-mark-validation\|ticket-mark-review" prompts/ skills/ extensions/ README.md

    # Delete the files
    rm prompts/ticket-mark-validation.md
    rm prompts/ticket-mark-review.md

    # Verify
    npm run smoke:bridge-message

Expected: the grep should find no chain references. The smoke test should pass.

### M2 — Single state file

Edit `skills/ticket-flow/SKILL.md`:
- Replace the "Machine state (JSON session artifacts)" section to document `ticket-flow/state.json` instead of two files
- Replace the `ticket-flow/invocation.json` and `ticket-flow/current.json` shape definitions with the single `state.json` shape
- Update the stage model to use the new stage names: `selecting`, `implementing`, `validating`, `reviewing`, `done`
- Remove the "Legacy compatibility" note about `waiting-worker` etc.

Edit `prompts/ticket-pick.md`:
- Replace all references to `invocation.json` and `current.json` with `state.json`
- Replace sentinel writes with a single `state.json` write
- Replace the final armed-state writes with one `state.json` write
- Keep the backward-compat check: if old `invocation.json` or `current.json` exist, tell the user to run `/ticket-reset`

Edit `prompts/ticket-finalize.md`:
- Replace dual-file reads with one `state.json` read
- Remove the advisory-only current.json handling
- Replace dual tombstone writes with one `state.json` write

Edit `prompts/ticket-reset.md`:
- Replace dual-file tombstones with one `state.json` tombstone
- Keep legacy markdown cleanup
- Add cleanup for old `invocation.json` / `current.json` artifacts

Edit `prompts/ticket-flow-init.md`:
- Update the artifact location listing to show `ticket-flow/state.json` instead of two files

### M3 — Artifact-based handoff

Edit `skills/ticket-flow-delegated-handoff/SKILL.md`:
- Replace "look for the most recent exact marker" with "read `ticket-flow/handoff.json` via `read_artifact`"
- Keep the same JSON shape requirements: ticket, ticket_path, mode, run_token
- Keep the `<!-- CHAIN_STOP -->` instruction for missing/malformed handoff

Edit `prompts/ticket-pick.md`:
- Add `write_artifact(name: "ticket-flow/handoff.json", ...)` instead of emitting the string in the assistant message
- The final assistant message can still include a human-readable summary, but the handoff data lives in the artifact

Edit `skills/ticket-implement/SKILL.md`, `skills/ticket-test-fix/SKILL.md`, `skills/ticket-review/SKILL.md`:
- Update step 1 in each to read `ticket-flow/handoff.json` via `read_artifact` instead of parsing chain context

### M4 — Tool-driven ticket-pick

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

Optionally add a `ticket_flow_arm` tool to `extensions/ticket-flow-tools.ts` that encapsulates steps 4-6.

### M5 — Unified artifact schema

Edit each skill's artifact contract section and each step's prompt to use the unified envelope.

In `skills/ticket-implement/SKILL.md`:
- Replace the artifact contract with the unified schema using `step: implement`, `status: ready-for-validation | blocked`

In `skills/ticket-test-fix/SKILL.md`:
- Replace with unified schema using `step: validate`, `status: ready-for-review | blocked`, `source_artifact: <implementation path>`

In `skills/ticket-review/SKILL.md`:
- Replace `gate: PASS | REVISE` with `status: pass | revise`
- Add `step: review` to the artifact

In `prompts/ticket-finalize.md`:
- Update parsing to expect the unified schema
- `status: pass` replaces `gate: PASS`, `status: revise` replaces `gate: REVISE`

### M6 — Remove deep-review chain

    # Verify nothing else references these
    grep -r "ticket-review-deep" prompts/ skills/ extensions/ README.md

    # Delete the 6 files
    rm prompts/ticket-review-deep.md
    rm prompts/ticket-review-deep-handoff.md
    rm prompts/ticket-review-deep-correctness.md
    rm prompts/ticket-review-deep-regression.md
    rm prompts/ticket-review-deep-tests.md
    rm prompts/ticket-review-deep-consolidate.md

Update `skills/ticket-flow/SKILL.md` and `README.md` if they reference deep review.

### M7 — Simplify finalize

Rewrite `prompts/ticket-finalize.md` to the ~10-step procedure described in Milestone 7 above. The prompt should reference `state.json` (not dual files), the unified artifact schema, and `ticket-flow/handoff.json` (not in-band parsing).

## Validation and Acceptance

After each milestone, run:

    # All smoke tests must pass
    npm run smoke:bridge-message
    npm run smoke:delegated-outcome
    npm run smoke:delegated-retry
    npm run smoke:delegated-policy
    npm run smoke:model-selection

After all milestones are complete, perform a manual end-to-end test:

1. In a target project with `tk` tickets, run `/ticket-flow`
2. Verify it selects a ticket, implements, validates, reviews, and finalizes
3. Verify `ticket-flow/state.json` (not two files) is the only state artifact
4. Verify `ticket-flow/handoff.json` exists after ticket-pick
5. Verify all three step artifacts use the unified schema (same `step` and `status` keys)

Acceptance criteria:
- No prompt or skill references `invocation.json` or `current.json` (only `state.json`)
- No prompt or skill references `Selection handoff JSON:` in-band parsing
- No prompt or skill uses `gate: PASS | REVISE` (use `status: pass | revise`)
- The 2 deprecated prompts and 6 deep-review prompts are deleted (8 files gone)
- `ticket-pick.md` is under 60 lines (from 172)
- `ticket-finalize.md` is under 60 lines (from 127)
- `ticket-flow-delegated-handoff/SKILL.md` is under 25 lines (from 63)
- All smoke tests pass

## Idempotence and Recovery

Each milestone can be committed independently. If a milestone introduces a regression, revert that single commit and re-approach. The state model change (M2) is the most disruptive — it changes the artifact names that all steps read/write. If M2 causes problems in production, the `/ticket-reset` command can clean up and users can re-run.

The `/ticket-reset` prompt must be updated alongside M2 to handle both old (dual) and new (single) state artifacts so that users can recover from partially-migrated sessions.

## Artifacts and Notes

### Current line counts (before simplification)

    prompts/ticket-pick.md           172 lines
    prompts/ticket-finalize.md       127 lines
    skills/ticket-flow/SKILL.md      203 lines
    skills/ticket-implement/SKILL.md 108 lines
    skills/ticket-test-fix/SKILL.md  133 lines
    skills/ticket-review/SKILL.md    118 lines
    skills/ticket-flow-delegated-handoff/SKILL.md  63 lines
    prompts/ticket-mark-*.md          34 lines (deprecated, to delete)
    prompts/ticket-review-deep-*.md  259 lines (to delete)
    Total ticket-flow files:        ~1,217 lines

### Expected line counts (after simplification)

    prompts/ticket-pick.md            ~40 lines
    prompts/ticket-finalize.md        ~50 lines
    skills/ticket-flow/SKILL.md       ~140 lines
    skills/ticket-implement/SKILL.md   ~85 lines
    skills/ticket-test-fix/SKILL.md    ~95 lines
    skills/ticket-review/SKILL.md      ~85 lines
    skills/ticket-flow-delegated-handoff/SKILL.md  ~20 lines (or merged)
    Total ticket-flow files:          ~515 lines

Net reduction: ~700 lines (57%), plus 8 prompt files deleted.

## Interfaces and Dependencies

### State artifact interface (new, replaces two old ones)

Session artifact `ticket-flow/state.json`:

    {
      "version": 3,
      "ticket": "flo-1234" | null,
      "ticket_path": ".tickets/flo-1234.md" | null,
      "run_token": "20260410T165200Z" | null,
      "mode": "single" | "queue",
      "stage": "selecting" | "implementing" | "validating" | "reviewing" | "done",
      "reason": "..."
    }

### Handoff artifact interface (new, replaces in-band string)

Session artifact `ticket-flow/handoff.json`:

    {
      "ticket": "flo-1234",
      "ticket_path": ".tickets/flo-1234.md",
      "mode": "single",
      "run_token": "20260410T165200Z"
    }

### Evidence artifact interface (unified, replaces three different schemas)

Session artifact `ticket-flow/<ticket>/<step>-<run-token>.md`:

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

### Tool surface (unchanged)

The four existing tools in `extensions/ticket-flow-tools.ts` remain as-is:
- `ticket_flow_new_run_token`
- `ticket_flow_artifact_paths`
- `ticket_flow_check_ticket`
- `ticket_flow_select`

Optional new tool for M4:
- `ticket_flow_arm` — wraps start-if-needed + run-token + state-arm in one deterministic call

### External dependencies

- `tk` CLI — must be installed in the target project for ticket operations
- `pi` coding agent — the runtime that loads extensions, skills, and prompts
- `pi-interactive-subagents` — bundled dependency for delegated subagent spawning
- `@sinclair/typebox` — peer dependency for tool parameter schemas
