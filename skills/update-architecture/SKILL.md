---
name: update-architecture
description: >
  Update ARCHITECTURE.md after ExecPlan implementation to reflect what was
  actually built. Syncs module map, data flows, decisions, and directory
  structure. Use after completing a ticket-flow cycle that implemented an
  ExecPlan.
---

# Update Architecture Docs

Synchronize ARCHITECTURE.md with changes made during ExecPlan implementation.

## Required inputs

- A completed or in-progress ExecPlan at `.ticket-flow/plans/<topic-slug>/execplan.md`.
- The project repository with the implementation changes.

## Topic resolution

1. If the user provides a topic argument, convert it to `<topic-slug>` (kebab-case, lowercase) before resolving plan paths.
2. If no argument, scan `.ticket-flow/plans/` for the most recent ExecPlan and use that directory name as `<topic-slug>`.
3. If no ExecPlan exists, tell the user there is nothing to sync and stop.

## Workflow

1. Read the ExecPlan at `.ticket-flow/plans/<topic-slug>/execplan.md`. Focus on the Progress section and Decision Log to understand what was actually implemented.
2. Locate ARCHITECTURE.md at the repo root.
3. If ARCHITECTURE.md does not exist, create one using the `architect` skill template, populated with the current state post-implementation. Stop after creation.
4. Analyze what was implemented and identify architectural impacts:
   - New modules or bounded contexts added
   - Changed data flows or boundaries
   - New integrations or dependencies
   - Updated directory structure
   - New cross-cutting concerns
   - Complexity that was removed or hidden
5. Update only the affected sections of ARCHITECTURE.md.
6. If diagrams exist (Mermaid or otherwise), update them to reflect new components and flows.
7. Update the "Last updated" date.

## Update principles

- Preserve existing structure and formatting.
- Add to existing sections rather than rewriting them.
- Update Key Design Decisions with new decisions made during implementation.
- Move resolved items from Open Questions to appropriate sections.
- Keep the same level of detail as the existing doc.
- Be honest: if the implementation introduced new complexity, document it in the Complexity Assessment.

## Hard rules

1. **Do not rewrite from scratch** unless the existing ARCHITECTURE.md is severely outdated or empty.
2. **Do not implement code.** This is documentation only.
3. **Read the actual code** to verify what was implemented — do not trust the plan alone.
4. **Be specific** — name actual files, modules, and functions.
5. **Record the sync** in the ExecPlan's Decision Log if the ExecPlan is still a living document.
