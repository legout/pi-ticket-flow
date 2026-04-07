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

## `ticket-flow/current.md` is stale or malformed

Run:

```text
/ticket-reset
```

This writes a tombstone state so the next run can start cleanly.

## Validation or review does not advance

Inspect:

- `ticket-flow/current.md`
- the referenced implementation, validation, and review artifacts

Common causes:

- implementation artifact is `blocked`
- validation artifact is missing or not `ready-for-review`
- `current.md` stage does not match the artifact state

## Queue finishes immediately

Possible causes:

- `tk ready` has no eligible tickets
- the queue was already completed in this session
- ticket dependencies or statuses prevent scheduling

Check `ticket-flow/progress.md` and the `.tickets/` statuses.

## `tk-ui` fails to launch

From `python/`, install dependencies:

```bash
uv sync
```

Then run again:

```bash
uv run tk-ui
```
