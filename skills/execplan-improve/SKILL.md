---
name: execplan-improve
description: >
  Deep-audit an existing ExecPlan by reading every referenced file and code
  path, then rewrite with code-grounded improvements. Applies 7-criteria
  audit and Ousterhout lens. Scores usefulness and short-circuits on
  diminishing returns. Use when improving, auditing, refining, or
  strengthening an ExecPlan.
---

# Improve ExecPlan

Every improvement must trace back to something found in the actual code. No speculative additions. No surface-level rewording.

## Required inputs

- An ExecPlan must exist at `.ticket-flow/plans/<topic-slug>/execplan.md`.
- `.ticket-flow/PLANS.md` must exist and be read in full before auditing the plan.
- If no ExecPlan exists, tell the user to run `/plan-create` first and stop.
- If `.ticket-flow/PLANS.md` is missing, tell the user to run `/ticket-flow-init` first and stop.
- If multiple ExecPlans exist in `.ticket-flow/plans/`, list them and ask which to improve.

## Topic resolution

1. If the user provides a topic argument, convert it to `<topic-slug>` (kebab-case, lowercase) before resolving plan paths.
2. If no argument, scan `.ticket-flow/plans/` for directories containing `execplan.md`. If exactly one match, use that directory name as `<topic-slug>`.
3. If multiple matches, list them and ask the user which to improve.
4. If no matches, tell the user to create an ExecPlan first and stop.

## Ousterhout lens

Use John Ousterhout's design philosophy as the design-quality lens for the audit:

- prefer deep modules over shallow wrappers
- prefer interfaces that hide sequencing and policy details
- prefer fewer concepts, fewer knobs, and fewer special cases
- prefer simpler mental models over visually tidy decomposition
- prefer moving complexity behind a stable boundary over redistributing it

Treat these as the main forms of complexity:

- change amplification
- cognitive load
- unknown unknowns

An improved plan is not just more accurate. It should also be clearer about why the target design is simpler and what complexity the change removes from the rest of the system.

## Workflow

### Step 0: Start Fresh Each Pass

Repeated improve passes are controlled by the prompt template loop configuration, not by state stored inside the ExecPlan file.

Always begin by reading the current ExecPlan and the current repository state.
If you find no substantive code-grounded improvements during this pass, do not modify the ExecPlan file at all. That no-file-change result is the correct convergence signal for repeated improve passes.

### Step 1: Parse the ExecPlan

Read the entire ExecPlan. Extract every file path, function/class/module name, command, milestone, acceptance criterion, and assumption.

### Step 2: Deep-Read Referenced Files

Read each file the plan mentions. Locate each named function/class/module. Flag anything that does not match reality:

- Missing or renamed files
- Different function signatures, types, or return values
- Import chains the plan does not account for
- Test files and test patterns actually in use
- Build/run commands the project actually uses

### Step 3: Explore Adjacent Code

Read files that import from or are imported by the referenced files. Look for:

- Existing patterns the plan should follow but does not mention
- Utilities the plan reinvents instead of reusing
- Conventions (naming, file structure, test layout) the plan would violate
- Related tests that would break or need updating
- Edge cases the plan misses
- Leaked sequencing or policy that the plan should hide behind a better boundary
- Shallow abstractions or pass-through layers the plan currently preserves without justification
- Duplicate concepts or special-case branches the plan could collapse or absorb

### Step 4: Audit the Plan

Read `.ticket-flow/PLANS.md` in full and audit the ExecPlan against that spec in addition to the criteria below.

Evaluate against seven criteria:

| Criteria | Question |
|----------|----------|
| **Accuracy** | Do paths exist? Do signatures match? Are behaviors described correctly? |
| **Completeness** | Every file, test, import, and dependency covered? Any missing milestones? |
| **Self-containment** | Could a novice implement end-to-end with only this file? Terms defined? Commands complete? |
| **Feasibility** | Steps achievable in order? Hidden dependencies between milestones? Are prerequisites, related non-blocking milestones, parallel-safe slices, and serialization points explicit? |
| **Testability** | Concrete verification per milestone? Test paths, names, assertions specified? |
| **Safety** | Idempotent? Retriable? Destructive ops have rollback? |
| **Design Quality** | Does the plan actually reduce complexity, deepen a boundary, hide sequencing/policy, explain the complexity dividend, and prefer independently verifiable slices over needless horizontal phases? |

### Step 5: Rewrite the Plan

Rewrite in-place at the same file path (`.ticket-flow/plans/<topic-slug>/execplan.md`). Preserve existing `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` content.

Apply only code-grounded improvements:

- Fix inaccuracies (wrong paths, signatures, line numbers)
- Add missing files, functions, dependencies, and milestones
- Split milestones that are too large
- Replace layer-by-layer milestone chains with smaller independently verifiable slices when that improves executability without changing intent
- Fill in vague commands with working directories and expected output
- Make acceptance criteria observable and verifiable
- Define undefined jargon
- Add idempotence/recovery instructions where missing
- Specify test-first verification where feasible
- Reference actual patterns and utilities discovered in Step 3
- Ensure every `.ticket-flow/PLANS.md`-required section exists and is substantive
- Make the plan explicit about the simpler boundary it is aiming to create
- Call out when a proposed abstraction is shallow and either justify it or replace it with a simpler plan shape
- Remove plan language that adds concepts or layers without reducing interface burden
- Name the complexity dividend: what future readers or callers no longer need to know after the change
- Make milestone prerequisites, related non-blocking links, safe parallelism, and serialization/conflict points explicit when the codebase evidence supports them

Do not change the plan's intent. Do not add milestones that do not serve the original purpose. Make the same plan more accurate, complete, and executable.

If your review finds no substantive code-grounded improvements, do not churn the prose just to make a diff. Do not modify the ExecPlan file at all in that case. A no-file-change result is the correct convergence signal for repeated improve passes.

### Step 6: Score the Usefulness of This Pass

Score the usefulness of this invocation, not the absolute quality of the final plan.

Use this rubric:

- `9-10/10`: the pass fixed multiple concrete execution blockers or major missing dependencies, and the implementation path would likely have failed without these changes.
- `7-8/10`: the pass added several substantive, code-grounded corrections that materially improve executability.
- `4-6/10`: the pass made real but moderate improvements; the plan is clearer and safer, but not fundamentally different.
- `1-3/10`: the pass found little to improve beyond minor wording, sequencing, or already-obvious clarifications.

The justification must be specific about what changed or what was missing.

### Step 7: Summarize Changes

If you rewrote the plan, append a revision note at the bottom of the plan describing what changed and why. Do not record the usefulness score inside the plan.
If you made no file changes because there were no substantive improvements left, do not append a revision note.

Report to the user:

- **Fixed**: inaccuracies corrected (wrong paths, signatures, etc.)
- **Added**: missing coverage (files, tests, milestones, commands)
- **Strengthened**: vague sections made concrete (acceptance criteria, verification steps)
- **Flagged**: risks or concerns worth attention
- Final line: `Usefulness score: X/10 - <specific reason>`

## Anti-patterns

- **Surface-level rewording** — Changing prose without reading code is worthless.
- **Adding boilerplate** — Every addition must be specific to this codebase and this change.
- **Removing intent** — Improve execution detail; do not second-guess the goal.
- **Speculative additions** — Every addition must trace back to something discovered in the code.
- **Ignoring existing progress** — Preserve completed milestones. Do not uncheck work that was done.
- **Blessing shallow design** — Do not preserve a needlessly thin abstraction or leaky interface just because it was already in the draft.
