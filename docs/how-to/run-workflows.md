# Run common workflows

## Plan a feature

Use the full planning entry point:

```text
/plan Add audit logging for admin actions
```

Use this when you want brainstorming plus an improved ExecPlan.

## Plan and immediately build

```text
/plan-and-build Add audit logging for admin actions
```

This runs plan → ticketize → queue.

## Process one ticket end to end

```text
/ticket-flow
```

Use this when you want exactly one ticket picked, implemented, validated, reviewed, and finalized.

## Process a queue of tickets

Run until no eligible tickets remain:

```text
/ticket-queue
```

Cap one run to a fixed number of tickets:

```text
/ticket-queue --loop 3
```

## Review code

Simple review:

```text
/review
```

Higher-confidence parallel review:

```text
/review-deep
```

Review, then fix issues until the reviewer approves:

```text
/review-fix-chain
```

## Refactor or simplify without implementing

```text
/refactor
/simplify
```

Use the `-deep` variants when you want broader analysis or optional research.

## Run a generic test-fix loop

```text
/test-fix
```

This is repo-level validation/fix, not the ticket-specific validation step.

## Generate docs

```text
/document
```

## Sync architecture after implementation

```text
/update-architecture
```

## Recover from stale state

```text
/ticket-reset
```

Use this when `ticket-flow/state.json` is malformed, stale, or points at a dead run.
