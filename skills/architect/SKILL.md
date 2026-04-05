---
name: architect
description: >
  Create or update ARCHITECTURE.md for the project. Deep-dives the codebase
  and applies the Ousterhout design lens to map boundaries, complexity, and
  data flows. Use when creating architecture docs or before creating an
  ExecPlan.
---

# Architect: Architecture Documentation

Create or update ARCHITECTURE.md with an honest, code-grounded assessment of the project's architecture.

## Required inputs

- Access to the project repository.
- Optionally, a brainstorm at `.ticket-flow/plans/<topic-slug>/brainstorm.md` for context.

## Topic resolution

1. If the user provides a topic argument, convert it to `<topic-slug>` (kebab-case, lowercase) before looking for `.ticket-flow/plans/<topic-slug>/brainstorm.md`.
2. If no argument, scan `.ticket-flow/plans/` for the most recent brainstorm and use its directory name as `<topic-slug>` context.
3. Architecture documentation is project-wide, so a topic is not required.

## Ousterhout lens

Apply John Ousterhout's design philosophy when assessing the architecture:

- prefer deep modules over shallow wrappers
- prefer interfaces that hide sequencing and policy details
- prefer fewer concepts, fewer knobs, and fewer special cases
- prefer simpler mental models over visually tidy decomposition
- prefer moving complexity behind a stable boundary over redistributing it

Treat these as the main forms of complexity:

- change amplification
- cognitive load
- unknown unknowns

## Behavior

### If ARCHITECTURE.md does not exist

1. Deep-dive the repo:
   - Map directory structure and module boundaries
   - Identify data flows and dependencies between modules
   - Find existing patterns, conventions, and utilities
   - Assess current complexity: what's deep, what's shallow, what leaks
2. Create ARCHITECTURE.md at the project root following the output format below.

### If ARCHITECTURE.md already exists

1. Read the existing ARCHITECTURE.md.
2. Inspect the current repo state (directory structure, module boundaries, data flows).
3. Identify what has changed since the document was last updated:
   - New modules or files
   - Changed dependencies
   - New patterns or conventions
4. Update only the affected sections. Preserve existing structure and formatting.
5. Update the "Last updated" date.
6. Add new design decisions to the Key Design Decisions section.
7. Move resolved items from Open Questions to appropriate sections.

## Output format

```md
# Architecture: <project-name>

_Last updated: <ISO-8601>_

## Purpose

<One paragraph: what this system does and for whom.>

## High-Level Design

<Prose description of the overall architecture. No more than 3-5 paragraphs.>

## Module Map

### <module-name>

- Path: `<repo-relative path>`
- Responsibility: <one sentence>
- Boundary: <what it hides from callers>
- Depends on: <other modules, libraries>

<Repeat for each module.>

## Data Flow

<How data moves through the system. Prose description, optionally with a Mermaid diagram.>

## Key Design Decisions

- Decision: <what was decided>
  Rationale: <why>
  Date: <when>

## Directory Structure

    <tree of key directories with one-line descriptions>

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| <name>     | <version> | <why it exists> |

## Open Questions

- <unresolved architectural questions>

## Complexity Assessment

### Deep Modules (good)

- <module-name>: <what complexity it hides from callers>

### Shallow Boundaries (candidates for deepening)

- <module-name>: <why it is shallow and what it could hide>

### Leaky Abstractions

- <where sequencing or policy leaks to callers>
```

## Hard rules

1. **Must read actual code**, not just file names. Open key files and understand what they do.
2. **Must be honest** about shallow modules and leaks. Do not sugarcoat architectural problems.
3. **Must be specific** — name actual files, functions, and modules with repo-relative paths.
4. **Preserve existing content** when updating. Add to existing sections rather than rewriting from scratch.
5. **If ARCHITECTURE.md exists, update it.** If not, create it.
6. **Do not implement code.** This is documentation only.
