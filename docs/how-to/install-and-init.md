# Install and initialize a project

## Recommended package topology

Install the subagent runtime **globally** and `pi-ticket-flow` **per project**.

Global:

```bash
pi install git:github.com/HazAT/pi-interactive-subagents
```

Project-local:

```bash
cd /path/to/project
pi install -l git:github.com/legout/pi-ticket-flow
```

Why this layout:

- subagent tools are available everywhere
- ticket workflow prompts and skills stay scoped to repos that use them

## Install from a local checkout

```bash
cd /path/to/pi-ticket-flow
npm install
pi install /absolute/path/to/pi-ticket-flow
```

## Reload pi after package changes

After changing package scope or settings, run:

```text
/reload
```

## Verify the bridge

Run:

```text
/bridge-smoke
```

Expected result: delegated prompt execution works.

## Initialize project guidance files

Run:

```text
/ticket-flow-init
```

This creates:

- `.ticket-flow/AGENTS.md`
- `.ticket-flow/PLANS.md`
- `AGENTS.md` at repo root, pointing to the project guidance

## Check prerequisites

Make sure the target repo has:

- a `.tickets/` directory managed by `tk`
- a supported multiplexer (`cmux`, `tmux`, or `zellij`)
- any project-specific test/build tooling needed by validation prompts

## Optional: use the Python ticket board

The repo also includes `python/tk_ui`, a small Textual board for `.tickets/`.
See [Optional Python `tk-ui`](../reference/python-tk-ui.md).
