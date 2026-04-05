---
name: ticketize
description: >
  Convert an ExecPlan's milestones into tk tickets. Sets dependencies,
  priorities, and embeds ExecPlan references so workers can read plan context
  during implementation. Use when converting a plan into actionable tickets.
---

# Ticketize: ExecPlan → tk Tickets

Convert an ExecPlan's milestones into actionable tk tickets with dependencies, priorities, and ExecPlan references.

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
3. For each milestone, determine ticket granularity (see Smart Ticketization Rules).
4. For each resulting ticket, create a tk ticket using `tk create` with:
   - Title from the milestone name
   - Description from the milestone prose, concrete steps, and acceptance criteria
   - Priority based on milestone ordering
   - The ExecPlan Reference block
5. Set ticket dependencies based on milestone ordering.
6. Report all created tickets with their IDs.

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

## Smart Ticketization Rules

### Default: one ticket per milestone

Each milestone in the ExecPlan becomes one tk ticket.

### Merge small adjacent milestones

If a milestone touches fewer than 3 files and the next milestone is also small and closely related, merge them into a single ticket. The merged ticket references both milestones.

### Split large milestones

If a milestone touches more than 8 files, split it into 2-3 tickets with sequential dependencies. Each split ticket references the same milestone but covers a distinct subset of files.

### Priority assignment

- First milestone → `priority: high`
- Second milestone → `priority: medium`
- Later milestones → `priority: medium` or `priority: low` depending on criticality

### Dependency ordering

Tickets are created in milestone order. Each ticket depends on the previous one unless the milestones are independent (explicitly stated as such in the plan).

## Ticket description format

For each ticket, include:

1. The milestone's goal, work, and result as prose.
2. The concrete steps relevant to this milestone.
3. Observable acceptance criteria from the plan's Validation and Acceptance section.
4. The ExecPlan Reference block.

## Output

- Report the number of tickets created.
- List each ticket with: ID, title, priority, dependencies.
- Note the ExecPlan path for traceability.

## Hard rules

- Do not modify the ExecPlan.
- Do not implement code.
- Do not close or modify existing tickets.
- Preserve milestone ordering via tk dependencies.
- Every ticket MUST have an ExecPlan Reference block.
- If `tk create` is not available, tell the user to install `tk` and stop.
