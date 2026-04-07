# Workflow model

`pi-ticket-flow` separates work into **planning**, **execution**, and **review**.

## Why planning is explicit

The package encourages an explicit path:

1. brainstorm
2. create an ExecPlan
3. improve the ExecPlan
4. turn milestones into tickets

This keeps ticket work narrow and reduces ad-hoc redesign during implementation.

## Why `/ticket-flow` only handles one ticket

Single-ticket execution keeps state simple:

- one selected ticket
- one implementation artifact
- one validation artifact
- one review artifact

That makes retries, escalation, and auditability easier.

## Why queue mode wraps single-ticket mode

`/ticket-queue` repeats the same core chain used by `/ticket-flow`.
It does not invent a second execution model.

That keeps:

- validation logic consistent
- review logic consistent
- artifact layout consistent

## Why implementation and validation are separate

Implementation and validation have different jobs:

- **implementation**: change code to satisfy the ticket
- **validation**: run the repo checks, fix breakage, and decide whether the ticket is ready for review

Splitting them avoids mixing “what was built” with “what passed”.

## Why review is separate again

Review should inspect the result critically, not justify the implementation.
Using a fresh reviewer agent after validation improves independence.

## Why the prompt-template bridge exists

The workflow relies on prompt templates for:

- command frontmatter
- chains and loops
- delegated prompt execution

But ticket execution also relies on the interactive subagent runtime. The bridge exists so these two systems work together cleanly.
