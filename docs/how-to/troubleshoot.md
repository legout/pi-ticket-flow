# Troubleshoot common problems

## Delegated prompts do not start

Check these first:

- you are running pi inside `cmux`, `tmux`, or `zellij`
- `pi-interactive-subagents` is installed
- `/bridge-smoke` passes

If not, fix the runtime before using `/ticket-flow` or `/ticket-queue`.

## pi reports duplicate tools

Recommended split:

- `pi-interactive-subagents` in `~/.pi/agent/settings.json`
- `pi-ticket-flow` in `.pi/settings.json`

Then run:

```text
/reload
```

## The wrong worker or reviewer model is used

Agent resolution precedence is:

1. project: `.pi/agents/*.md`
2. global: `~/.pi/agent/agents/*.md`
3. package: bundled agents in this repo

Also note:

- `worker` and `reviewer` usually come from `pi-interactive-subagents`
- `pi-ticket-flow` specializes them through prompt frontmatter and skills

If behavior looks wrong, inspect the active agent file and run `/reload`.

## `ticket-flow/current.json` or `ticket-flow/invocation.json` is stale or malformed

Run:

```text
/ticket-reset
```

This writes a safe JSON tombstone to `ticket-flow/current.json` and a blocked sentinel to `ticket-flow/invocation.json` so the next run can start cleanly.

`/ticket-reset` also clears legacy markdown state files (`ticket-flow/current.md` and `ticket-flow/invocation.md`) if they still exist from older workflow versions.

If `/ticket-queue` stops immediately because it found unfinished or malformed orchestrator state, that is intentional — fix the stale state with `/ticket-reset` before retrying the queue.

## Validation or review does not complete

Transient delegated-provider overloads (`429`, `temporarily overloaded`, rate-limit style errors) are retried automatically with backoff. If the delegated prompt lists multiple models, retries can fall back to the next configured model.

Inspect:

- `ticket-flow/invocation.json`
- `ticket-flow/current.json`
- the referenced implementation, validation, and review artifacts

Remember:

- `invocation.json` carries the active ticket id, ticket path, and run token
- `current.json` is only an active/done marker

Common causes:

- implementation artifact is `blocked`
- validation artifact is missing or not `ready-for-review`
- delegated selection handoff is missing or malformed in chain context
- the invocation guard is still `blocked`
- the implementation artifact no longer matches the actual worktree

## Queue finishes immediately

Possible causes:

- `tk ready` has no eligible tickets
- all ready tickets are escalated, blocked by dependencies, or otherwise ineligible
- the queue was already completed in this session

Check `ticket-flow/progress.md`, `tk ready`, and the `.tickets/` statuses.

## `tk-ui` fails to launch

From `python/`, install dependencies:

```bash
uv sync
```

Then run again:

```bash
uv run tk-ui
```
