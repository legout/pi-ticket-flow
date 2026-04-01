# pi-ticket-flow

Standalone pi package for **tk ticket workflows** with both single-ticket and queue modes.

It bundles:
- delegated chain workflow (`/ticket-flow`)
- queue workflow (`/ticket-queue`)
- direct fallback workflow (`/ticket-step`, `/ticket-direct`)
- reset command (`/ticket-reset`)
- smoke test (`/bridge-smoke`)
- fresh worker/reviewer subagents
- native async subagent runtime via `pi-interactive-subagents`
- prompt-template compatibility bridge for `subagent:` frontmatter

## What it provides

### Commands

- `/ticket-flow` — delegated chain workflow for exactly one ticket
- `/ticket-queue` — sequential Ralph-style queue processing until no eligible tickets remain by default
- `/ticket-flow-chain` — explicit alias for delegated chain workflow
- `/ticket-step` — direct fallback workflow
- `/ticket-direct` — explicit alias for direct fallback workflow
- `/ticket-reset` — clear stale orchestrator state
- `/bridge-smoke` — verify delegated prompt execution works

### Agents

- `ticket-worker` — implementation agent using `kimi-coding/k2p5`
- `ticket-reviewer` — review agent using `openai-codex/gpt-5.4-mini`
- `ticket-smoke` — minimal smoke-test agent

## Install

### From local path

```bash
cd pi-ticket-flow
npm install
pi install /absolute/path/to/pi-ticket-flow
```

### From git or npm

After publishing, install with one command:

```bash
pi install git:github.com/legout/pi-ticket-flow
# or
pi install npm:pi-ticket-flow
```

## Requirements

- run pi inside `cmux`, `tmux`, or `zellij`
- `tk` must be available in the target project
- the target project should use `.tickets/`

## Implementation note

This package uses:
- `pi-interactive-subagents` as the actual subagent runtime
- `pi-prompt-template-model` for prompt templates with `subagent:` frontmatter
- a small compatibility bridge in this package so prompt-template delegation uses the interactive subagent runtime

The package auto-registers the canonical `ticket-*` agents into `~/.pi/agent/agents/` when loaded so the interactive subagent runtime can discover them.

## Skills

Workflow skill:
- `ticket-flow`

## Workflow model

### Single-ticket workflow

`/ticket-flow` processes **exactly one ticket per invocation**.

High-level flow:
1. pick or resume a ticket
2. delegate implementation to a fresh worker
3. run validation until green (inside worker)
4. delegate review to a fresh reviewer
5. close on PASS, retry on REVISE up to 3 times, then ESCALATE

### Queue workflow

`/ticket-queue` processes tickets sequentially.

Default behavior:
- run until `tk ready` has no eligible tickets left

Optional behavior:
- pass `--loop N` to cap how many tickets are processed in one invocation

## State contract

Artifacts used by the workflow:
- `ticket-flow/current.md`
- `ticket-flow/<ticket-id>/implementation.md`
- `ticket-flow/<ticket-id>/review.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

## Notes

- `/ticket-flow` is the preferred single-ticket path.
- `/ticket-queue` is the preferred multi-ticket Ralph-style loop.
- Use `/ticket-queue` instead of `/ticket-flow --loop ...` for batch processing.
- `/ticket-step` remains available as a fallback if the delegated chain flow misbehaves.
- `/bridge-smoke` is the first thing to run after install.
