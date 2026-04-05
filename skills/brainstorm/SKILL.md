---
name: brainstorm
description: >
  Interactive divergent brainstorming session for a topic or feature idea.
  Produces a structured brainstorm.md repo file in .ticket-flow/plans/. Use
  when the user wants to explore ideas, brainstorm, think through a feature,
  or discuss architecture before planning. Also auto-triggered by /plan when
  no brainstorm exists yet.
---

# Brainstorm: Interactive Divergent Thinking

This skill implements an interactive brainstorming session that produces a structured brainstorm.md repo file.

## Goal

Explore a topic or feature idea from multiple angles: assumptions, constraints, trade-offs, alternatives, and risks. The output is a structured document that captures the exploration and the user's chosen direction.

## Mode

This is an **interactive** skill. The agent and the user engage in multi-turn conversation. The agent must not treat this as a one-shot prompt — it should explore deeply, ask probing questions, and let the user steer.

## Topic resolution

1. If the user provides a topic argument, use it.
2. If the user invokes `/plan <topic>` and no brainstorm exists, this skill is auto-triggered with that topic.
3. The `<topic-slug>` is derived from the topic (kebab-case, lowercase, max 40 chars).

## Behavior

### Phase 1: Explore

1. Acknowledge the topic and restate it to confirm understanding.
2. Explore the following dimensions:
   - **Problem statement**: What is the core problem or opportunity? User-facing perspective.
   - **Stakeholders**: Who cares about this and why?
   - **Constraints**: Hard constraints (cannot change) vs. soft preferences (could relax).
   - **Approaches**: Present at least 2 alternative approaches with pros, cons, and risks.
   - **Trade-offs**: What is being exchanged for what?
   - **Risks and unknowns**: What could go wrong? What is uncertain?
   - **Success criteria**: What does "done" look like?
3. Ask the user for input at natural pause points. Do not dump all questions at once.

### Phase 2: Converge

4. After sufficient exploration, summarize the key insights.
5. Ask the user to choose a direction (or confirm the direction they've been steering toward).
6. Record the chosen direction and all decisions made during the session.

### Phase 3: Write

7. Write the brainstorm document to `.ticket-flow/plans/<topic-slug>/brainstorm.md`.
8. Create the directory if it does not exist.
9. Report the file path and a brief summary.

## Output format

Write the brainstorm document using this exact structure:

```md
# Brainstorm: <topic>

date: <ISO-8601>
status: complete

## Problem Statement

<What is the core problem or opportunity? User-facing perspective.>

## Stakeholders

- <who cares about this and why>

## Constraints

### Hard constraints

- <constraints that cannot be changed>

### Soft constraints

- <preferences that could be relaxed>

## Ideas Explored

### Approach A: <name>

- Description: <what this approach entails>
- Pros: <benefits>
- Cons: <drawbacks>
- Risks: <what could go wrong>

### Approach B: <name>

- Description: <what this approach entails>
- Pros: <benefits>
- Cons: <drawbacks>
- Risks: <what could go wrong>

## Trade-offs Identified

- <trade-off 1: what is being exchanged for what>
- <trade-off 2>

## Risks and Unknowns

- <risk 1>
- <unknown 1>

## Open Questions

- <question that needs resolution before or during planning>

## Chosen Direction

<What the user decided, in their own words when possible.>

## Decisions Made

- Decision: <what was decided>
  Rationale: <why>

## Key Assumptions

- <assumption that the plan will rely on>

## Success Criteria

- <observable outcome that means "done">
```

## Hard rules

1. **Never implement code.** This is a thinking session, not a coding session.
2. **Never create tickets.** That is `/ticketize`'s job.
3. **Always present multiple perspectives.** At least 2 approaches must be explored.
4. **Record user decisions explicitly.** When the user makes a choice, capture it.
5. **Stop and ask when direction is ambiguous.** Do not assume the user's intent.
6. **Be interactive, not dump-and-run.** Present ideas in digestible chunks. Pause for user input. Let the user steer.
7. **Write the file at the end, not incrementally.** The brainstorm.md is the final output, not a running log.

## Ending the session

The brainstorm ends when:
- The user says "done", "that's enough", "make a plan", or similar.
- The agent and user have converged on a direction.
- The user explicitly asks to write the brainstorm.

At that point, write the brainstorm.md and report the file path.
