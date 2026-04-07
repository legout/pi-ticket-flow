# Get started with `pi-ticket-flow`

This tutorial walks through the smallest useful setup: install the package, initialize a repo, plan some work, and run one ticket.

## Before you start

You need:

- `pi`
- `tk`
- a terminal multiplexer supported by subagents: `cmux`, `tmux`, or `zellij`
- a repo that uses `.tickets/`

## 1. Install the runtime once

Install `pi-interactive-subagents` globally:

```bash
pi install git:github.com/HazAT/pi-interactive-subagents
```

## 2. Install `pi-ticket-flow` in the target repo

```bash
cd /path/to/repo
pi install -l git:github.com/legout/pi-ticket-flow
```

If you changed package configuration, run `/reload` in pi.

## 3. Verify delegated execution

Run:

```text
/bridge-smoke
```

If this fails, fix that first before using the ticket workflows.

## 4. Initialize the repo

Run:

```text
/ticket-flow-init
```

This scaffolds:

- `.ticket-flow/AGENTS.md`
- `.ticket-flow/PLANS.md`
- an `AGENTS.md` reference at the repo root

## 5. Create a plan

For a new feature, start with:

```text
/plan Add CSV export for weekly reports
```

This may brainstorm first, then create and improve an ExecPlan.

## 6. Turn the plan into tickets

```text
/ticketize
```

Or use the shortcut:

```text
/plan-and-build Add CSV export for weekly reports
```

## 7. Run one ticket

```text
/ticket-flow
```

The workflow is:

1. pick a ticket
2. implement it
3. validate and fix it
4. review it
5. finalize it

## 8. Inspect progress

Useful files while the workflow runs:

- `ticket-flow/current.md`
- `ticket-flow/<ticket-id>/implementation-<run-token>.md`
- `ticket-flow/<ticket-id>/validation-<run-token>.md`
- `ticket-flow/<ticket-id>/review-<run-token>.md`

## 9. Recover if needed

If state gets stuck:

```text
/ticket-reset
```

## Next

- For install and setup details, see [Install and initialize a project](../how-to/install-and-init.md)
- For day-to-day usage, see [Run common workflows](../how-to/run-workflows.md)
- To understand the workflow design, see [Workflow model](../explanation/workflow-model.md)
