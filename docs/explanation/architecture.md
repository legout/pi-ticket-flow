# Architecture

The project has five main layers.

## 1. Prompt layer

`prompts/` defines the slash commands and prompt chains.

Examples:

- planning entry points like `plan.md`
- execution chains like `ticket-flow.md`
- support prompts like `ticket-implement.md`

## 2. Skill layer

`skills/` contains the long-form instructions that shape agent behavior.

Examples:

- `ticket-flow`
- `ticket-implement`
- `ticket-test-fix`
- `ticket-review`

## 3. Agent layer

`agents/` contains bundled helper agents:

- `ticket-smoke`
- `researcher`
- `change-planner`

These are synced into `~/.pi/agent/agents/` by `extensions/register-ticket-agents.ts`.

## 4. Extension layer

`extensions/` wires the package into pi.

Key jobs:

- register subagent tools and artifact tools when not already installed globally
- detect existing `pi-interactive-subagents` packages to avoid duplicate tools
- bridge `pi-prompt-template-model` delegated prompts onto the interactive subagent runtime
- expose a small runtime for agent discovery

## 5. Optional Python UI

`python/tk_ui` is a separate Textual board for browsing `.tickets/`.
It is helpful, but not required for the prompt workflows.

## Data flow

At a high level:

1. a prompt starts a workflow
2. a skill defines the detailed procedure
3. a subagent performs one focused step
4. the step writes an artifact
5. the orchestrator reads artifacts and advances state

## Important design choice

`worker` and `reviewer` are usually **base agents from `pi-interactive-subagents`**, not custom agents in this repo.
This repo specializes them mostly through:

- prompt frontmatter
- skills
- orchestration state and artifacts

That keeps the package small while still allowing focused ticket workflows.
