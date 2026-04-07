---
name: ticketize
description: >
  Convert an ExecPlan's milestones into tk tickets. Sets dependencies,
  priorities, and embeds ExecPlan references so workers can read plan context
  during implementation. Use when converting a plan into actionable tickets.
---

# Ticketize: ExecPlan → tk Tickets

Convert an ExecPlan's milestones into actionable tk tickets with dependencies, priorities, and ExecPlan references.

The goal is not mechanical milestone-to-ticket conversion. The goal is a set of tickets that are independently implementable where possible, dependency-accurate, and safe to schedule.

## Required inputs

- An ExecPlan must exist at `.ticket-flow/plans/<topic-slug>/execplan.md`.
- If no ExecPlan exists, tell the user to run `/plan-create` first and stop.
- If multiple ExecPlans exist in `.ticket-flow/plans/`, list them and ask which to ticketize.

## Topic resolution

1. If the user provides a topic argument, convert it to `<topic-slug>` (kebab-case, lowercase) before resolving plan paths.
2. If no argument, scan `.ticket-flow/plans/` for directories containing `execplan.md`. If exactly one match, use that directory name as `<topic-slug>`.
3. If multiple matches, list them and ask the user which to ticketize.
4. If no matches, tell the user to create an ExecPlan first and stop.

## Behavior

1. Read `.ticket-flow/plans/<topic-slug>/execplan.md` in full.
2. Parse all milestones from the Milestones section.
3. Extract any explicit dependency, sequencing, parallelism, related-work, conflict-risk, enabler, migration, cleanup, or prototype cues from milestone prose and the rest of the ExecPlan.
4. For each milestone, determine ticket granularity (see Smart Ticketization Rules).
5. For each resulting ticket, create a tk ticket using `tk create` with:
   - Title from the milestone name
   - Description from the milestone prose, concrete steps, and acceptance criteria
   - Priority based on milestone ordering
   - The ExecPlan Reference block
   - Ticket kind / scheduling hints when relevant
6. Set ticket dependencies from explicit prerequisites first, then from inferred blocking relationships, and only fall back to milestone ordering when the plan provides no better dependency signal.
7. Report all created tickets with their IDs.

## ExecPlan Reference Block

Every ticket created by this skill MUST include this block in its description:

```
## ExecPlan Reference

- Plan: `.ticket-flow/plans/<topic-slug>/execplan.md`
- Milestone: <milestone number and title>
- Read these sections before implementing:
  - "Context and Orientation" for repo layout and terms
  - Milestone <N> for this ticket's scope
  - "Interfaces and Dependencies" for types and contracts
  - "Decision Log" for any decisions already made
```

This gives the ticket worker enough pointers to read the most relevant parts of the ExecPlan during implementation.

When useful, append this optional block after the ExecPlan Reference block:

```
## Scheduling Hints

- Kind: vertical-slice | enabler | migration | cleanup | prototype
- Depends on: <ticket ids, milestone names, or none>
- Related to: <ticket ids, milestone names, or none>
- Conflicts with: <ticket ids, milestone names, or none>
- Parallel-safe with: <ticket ids, milestone names, or none/unknown>
- Serialization points: <shared boundary that should not be changed concurrently>
- Suggested worktree isolation: required | recommended | optional
```

Use it when the plan makes the scheduling intent clear enough to be helpful.

Interpretation:

- `Depends on` is a hard scheduling constraint and should be reflected in tk dependencies.
- `Related to` is a soft link for context and traceability only; it does not block readiness.
- `Conflicts with` means the tickets may be logically independent but are poor candidates for concurrent implementation because they likely collide in files, tests, shared contracts, schema, or merge behavior.
- `Parallel-safe with` is a positive signal that concurrent work is acceptable.
- `Suggested worktree isolation` indicates whether concurrent work should happen in separate worktrees to reduce risk.

## Smart Ticketization Rules

### Default: one ticket per independently verifiable milestone

If a milestone already represents a coherent, independently verifiable slice, make it one ticket.

### Prefer vertical slices when splitting

If a milestone contains multiple end-to-end slices, use cases, workflows, or contract-visible behaviors, split it along those slice boundaries before considering file-count-based splits.

Prefer tickets like:
- "create item end-to-end"
- "list items end-to-end"
- "migrate callers to new adapter"

over tickets like:
- "update data layer"
- "update service layer"
- "update UI layer"

### Merge small adjacent milestones

If a milestone is a tiny enabler, migration follow-up, or cleanup step and the adjacent milestone is also small and tightly coupled, merge them into a single ticket when that yields a more reviewable unit. The merged ticket references both milestones.

### Split large milestones

If a milestone is too large for one ticket, first split it into 2-3 vertical tickets. Only if no meaningful vertical split exists, split by bounded implementation areas with explicit sequential dependencies. Each split ticket references the same milestone but covers a distinct, reviewable subset.

### Classify ticket kind

Classify each resulting ticket as one of:

- `vertical-slice` — delivers observable or contract-visible behavior end-to-end
- `enabler` — introduces a seam, contract, or infrastructure prerequisite
- `migration` — moves callers or data from old path to new path
- `cleanup` — removes obsolete paths or temporary compatibility code
- `prototype` — validates feasibility before wider rollout

Prefer `vertical-slice` tickets unless the plan evidence clearly calls for another kind.

### Priority assignment

- First milestone → `priority: high`
- Second milestone → `priority: medium`
- Later milestones → `priority: medium` or `priority: low` depending on criticality

### Dependency ordering

Build a dependency DAG, not an automatic chain.

- Use explicit plan prerequisites first.
- `enabler` tickets usually block the vertical slices that rely on them.
- `cleanup` tickets usually depend on all slices that still rely on the old path.
- If two tickets touch the same serialization point, prefer an explicit dependency unless the plan says they are safe in parallel.
- If the plan explicitly says milestones are parallel-safe, do not add unnecessary dependencies.
- Only fall back to milestone ordering when the plan gives no better dependency signal.

### Soft links and conflict hints

Track non-blocking relationships separately from hard dependencies.

- Use `Related to` for tickets that share context, belong to the same slice family, or are likely to be reviewed together, but do not require ordering.
- Use `Conflicts with` for tickets that should usually not be implemented concurrently even if neither logically depends on the other.
- Prefer `Conflicts with` when tickets touch the same shared contract, schema migration area, registry, package manifest, central config, or broad integration tests.
- Do not convert `Related to` or `Conflicts with` into tk dependencies unless the ExecPlan clearly states they are true prerequisites.

## Ticket description format

For each ticket, include:

1. The milestone's goal, work, and result as prose.
2. The concrete steps relevant to this milestone.
3. Observable acceptance criteria from the plan's Validation and Acceptance section.
4. The ExecPlan Reference block.
5. Optional scheduling hints when they clarify dependencies, related work, conflict risk, or parallel-safety.

## Output

- Report the number of tickets created.
- List each ticket with: ID, title, kind, priority, dependencies, and any related/conflict hints that matter for scheduling.
- Note the ExecPlan path for traceability.

## Hard rules

- Do not modify the ExecPlan.
- Do not implement code.
- Do not close or modify existing tickets.
- Prefer dependency accuracy over mechanical milestone ordering.
- Do not invent parallel safety when the plan or codebase evidence is unclear; use conservative dependencies instead.
- Do not turn soft links into hard dependencies unless the plan or codebase evidence makes the prerequisite relationship real.
- Every ticket MUST have an ExecPlan Reference block.
- If `tk create` is not available, tell the user to install `tk` and stop.
