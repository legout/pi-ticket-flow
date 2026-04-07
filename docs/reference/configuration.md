# Configuration, agents, and delegated prompt behavior

## Package contents

`pi-ticket-flow` ships four main resource types:

- `prompts/` — slash commands and prompt chains
- `skills/` — long-form task instructions
- `agents/` — bundled helper agents (`ticket-smoke`, `researcher`, `change-planner`)
- `extensions/` — runtime glue for agents, artifacts, and delegated prompts

It also vendors `pi-prompt-template-model` in `vendor/pi-prompt-template-model/` so delegated prompt behavior can be patched locally.

## Recommended install topology

- install `pi-interactive-subagents` globally
- install `pi-ticket-flow` per project

This avoids duplicate tools and keeps ticket-specific behavior scoped to the right repos.

## Agent discovery precedence

Subagents are resolved in this order:

1. project: `.pi/agents/<name>.md`
2. global: `~/.pi/agent/agents/<name>.md`
3. package: bundled agents from this repository

Bundled helper agents in this repo:

| Agent | Purpose |
| --- | --- |
| `ticket-smoke` | Minimal bridge smoke-test agent |
| `researcher` | Focused external research |
| `change-planner` | Shared planner for refactor/simplify work |

Base `worker` and `reviewer` usually come from `pi-interactive-subagents`.

## Bundled extensions

| Extension file | Role |
| --- | --- |
| `register-ticket-agents.ts` | Exposes bundled agents and sets `PI_SUBAGENT_RUNTIME_ROOT` |
| `interactive-subagents-tools.ts` | Registers subagent tools when the global package is absent |
| `interactive-session-artifacts.ts` | Registers artifact tools when needed |
| `interactive-subagents-detection.ts` | Detects whether `pi-interactive-subagents` is already configured |
| `prompt-template-interactive-bridge.ts` | Adapts delegated prompt execution to the interactive subagent runtime |
| `extensions/subagent-runtime/agents.ts` | Agent discovery runtime used by the bridge |

## Delegated prompt frontmatter

When a prompt uses `subagent: ...`, some fields are handled by the parent prompt runtime and others must be forwarded to the child session.

| Frontmatter | Handled by | Notes |
| --- | --- | --- |
| `model` | child bridge | prompt model wins over the base agent default |
| `thinking` | child bridge | prompt thinking overrides the base agent default |
| `skill` | child bridge | merged with agent skills |
| `subagent` | parent | picks the target agent |
| `inheritContext` | parent + child bridge | maps to child `fresh` vs `fork` |
| `cwd` | child bridge | delegated subprocess working directory |
| `loop` | parent | each iteration is a separate delegated run |
| `rotate` | parent | rotates model/thinking across loop iterations |
| `fresh` | parent | compacts parent context between iterations |
| `converge` | parent | early-stop rule for loop/chain execution |
| `restore` | parent | restores parent model/thinking after execution |
| `chain` | parent | orchestrates multiple prompt steps |
| `chainContext` | parent | prepends prior-step summaries to later delegated steps |

Important:

- `fresh` is **not** the same as `inheritContext`
- `rotate` only matters with loops
- `chain` and `subagent` cannot be combined on the same prompt template
- future child-execution frontmatter may require explicit bridge updates
