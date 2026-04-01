# pi-ticket-flow

Standalone pi package for the Ralph-Wiggum **one-ticket** workflow.

It bundles:
- delegated chain workflow (`/rw-ticket`)
- direct fallback workflow (`/rw-step`, `/rw-ticket-direct`)
- reset command (`/rw-reset`)
- smoke test (`/bridge-smoke`)
- fresh worker/reviewer subagents
- native async subagent runtime via `pi-interactive-subagents`
- prompt-template compatibility bridge for `subagent:` frontmatter

## What it provides

### Commands

- `/rw-ticket` — delegated chain workflow (preferred)
- `/rw-ticket-chain` — explicit alias for delegated chain workflow
- `/rw-step` — direct fallback workflow
- `/rw-ticket-direct` — explicit alias for direct fallback workflow
- `/rw-reset` — clear stale orchestrator state
- `/bridge-smoke` — verify delegated prompt execution works

### Agents

- `rw-worker` — implementation agent using `kimi-coding/k2p5`
- `rw-reviewer` — review agent using `openai-codex/gpt-5.4-mini`
- `rw-smoke` — minimal smoke-test agent

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

The package also auto-registers `rw-worker`, `rw-reviewer`, and `rw-smoke` into `~/.pi/agent/agents/` when loaded so the interactive subagent runtime can discover them.

## Workflow model

The package processes **exactly one ticket per invocation**.

High-level flow:
1. pick or resume a ticket
2. delegate implementation to a fresh worker
3. run validation until green (inside worker)
4. delegate review to a fresh reviewer
5. close on PASS, retry on REVISE up to 3 times, then ESCALATE

## State contract

Artifacts used by the workflow:
- `rw/current.md`
- `rw/<ticket-id>/implementation.md`
- `rw/<ticket-id>/review.md`

## Notes

- `/rw-ticket` is the preferred path.
- `/rw-step` remains available as a fallback if the delegated chain flow misbehaves.
- `/bridge-smoke` is the first thing to run after install.
