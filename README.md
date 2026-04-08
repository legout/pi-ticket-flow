# pi-ticket-flow

Standalone pi package for **tk ticket workflows** with brainstorming, planning, ExecPlan creation, and delegated single-ticket and queue modes.

## Documentation

The project now includes short Diátaxis-style docs in [`docs/`](docs/README.md):

- [Tutorials](docs/tutorials/get-started.md)
- [How-to guides](docs/how-to/install-and-init.md)
- [Reference](docs/reference/commands.md)
- [Explanation](docs/explanation/workflow-model.md)

It bundles:
- setup/init command (`/ticket-flow-init`)
- brainstorming skill (`/brainstorm`)
- bundled `researcher` subagent for optional external research during planning
- architecture documentation (`/architect`)
- ExecPlan creation and improvement (`/plan-create`, `/plan-improve`)
- full planning pipeline (`/plan`, `/plan-chain`)
- ExecPlan-to-ticket conversion (`/ticketize`)
- full plan-and-build pipeline (`/plan-and-build`)
- delegated chain workflow (`/ticket-flow`)
- queue workflow (`/ticket-queue`)
- reset command (`/ticket-reset`)
- smoke test (`/bridge-smoke`)
- fresh worker/reviewer subagents
- native async subagent runtime via `pi-interactive-subagents`
- prompt-template compatibility bridge for `subagent:` frontmatter

## What it provides

### Planning Commands

- `/ticket-flow-init` — scaffold `.ticket-flow/AGENTS.md`, `.ticket-flow/PLANS.md`, and the root `AGENTS.md` reference
- `/brainstorm <topic>` — interactive divergent brainstorming session
- `/architect` — create or update ARCHITECTURE.md
- `/plan <topic>` — full planning pipeline (brainstorm if needed, then delegates to `/plan-chain`)
- `/plan-chain <topic>` — non-interactive planning chain: architect → plan-create → plan-improve
- `/plan-create` — create an ExecPlan from an existing brainstorm
- `/plan-improve` — deep-audit and improve an existing ExecPlan (loops up to 3×)
- `/review` — simple code review
- `/review-deep` — deep parallel multi-lens code review with final consolidation
- `/refactor-deep` — deeper refactoring analysis with optional research
- `/simplify-deep` — deeper simplification analysis with optional research
- `/ticketize` — convert ExecPlan milestones into dependency-aware tk tickets with ExecPlan references and scheduling hints
- `/plan-and-build <topic>` — full pipeline: plan → ticketize → ticket-queue

### Execution Commands

- `/ticket-flow` — delegated chain workflow for exactly one ticket (pick → implement → validate/fix → review → finalize)
- `/ticket-queue` — sequential queue processing until no eligible tickets remain (loops, tracks progress/lessons)
- `/ticket-test-fix` — validate and fix the currently selected ticket until it is ready for review
- `/ticket-review-deep` — deep ticket review with parallel review passes and final consolidation
- `/ticket-reset` — clear stale orchestrator state
- `/bridge-smoke` — verify delegated prompt execution works

### Maintenance Commands

- `/update-architecture` — sync ARCHITECTURE.md after ExecPlan implementation

### Agents

- `ticket-smoke` — minimal smoke-test agent
- `researcher` — focused research agent for docs, APIs, best practices, and technology choices
- `change-planner` — shared planner for refactor/simplify analysis and todo creation

Ticket implementation, validation/fix-to-green, and review use the base `worker` and `reviewer` agents provided by `pi-interactive-subagents`, specialized through the `ticket-implement`, `ticket-test-fix`, and `ticket-review` skills/prompts.

## Install

### Recommended topology

Use `pi-interactive-subagents` as a **global** pi package, and install `pi-ticket-flow` only in projects that actually use ticket workflows.

Global install once:

```bash
pi install git:github.com/HazAT/pi-interactive-subagents
```

Project-local install where needed:

```bash
cd /path/to/project
pi install -l git:github.com/legout/pi-ticket-flow
```

Then run `/ticket-flow-init` inside the target project to scaffold the recommended `.ticket-flow/` guidance files.

This keeps the canonical subagent/artifact tools available everywhere while limiting `pi-ticket-flow` prompts, skills, and ticket workflow behavior to the relevant repositories.

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
- a vendored `pi-prompt-template-model` runtime for prompt templates with `subagent:` frontmatter
- a small compatibility bridge in this package so prompt-template delegation uses the interactive subagent runtime and preserves delegated prompt model/skill/thinking behavior

The package auto-registers its bundled agents into `~/.pi/agent/agents/` when loaded so the interactive subagent runtime can discover them. This includes the bundled helper agents such as `ticket-smoke`, `researcher`, and `change-planner`. Ticket implementation and review now use the base `worker` and `reviewer` agents from `pi-interactive-subagents` via specialized prompts/skills.

### Prompt-template frontmatter behavior with `subagent:`

When a prompt uses `subagent: ...`, prompt-template frontmatter splits into two categories:

- **parent/orchestrator fields** — handled by `pi-prompt-template-model` before or around delegation
- **child/subagent fields** — forwarded through the bridge to the spawned subagent session

| Frontmatter | Handled by | Behavior with delegated prompts |
| --- | --- | --- |
| `model` | child bridge | forwarded to the spawned subagent; prompt model wins over the base agent default |
| `thinking` | child bridge | forwarded to the spawned subagent; prompt thinking overrides the base agent default |
| `skill` | child bridge | forwarded to the spawned subagent; merged with agent skills |
| `subagent` | parent | selects which agent to delegate to |
| `inheritContext` | parent + child bridge | controls whether the child starts `fresh` or receives a `fork` of the current session |
| `cwd` | child bridge | forwarded as the delegated subagent working directory |
| `loop` | parent | reruns the prompt multiple times; each iteration is a separate delegated subagent run |
| `rotate` | parent | rotates model/thinking across loop iterations before each delegated run |
| `fresh` | parent | collapses parent context between loop/chain iterations; does not change child startup mode by itself |
| `converge` | parent | stops loop/chain iterations early when the delegated run makes no file changes |
| `restore` | parent | restores the parent session model/thinking after execution |
| `chain` | parent | orchestrates multiple prompt steps; delegated steps inside the chain are allowed |
| `chainContext` | parent | prepends prior-step summaries to later delegated chain steps |

Important notes:

- `fresh` and `inheritContext` are different: `inheritContext` controls child startup context, while `fresh` controls parent compaction between iterations.
- `rotate` only matters when looping.
- `chain` and `subagent` cannot be combined on the same prompt template, but a chain may contain steps that are delegated prompts.
- New prompt-template features that affect **child execution** may require explicit bridge updates; parent-only orchestration features usually work automatically once supported by the vendored prompt-template runtime.

## Tool conflict note

This package already exposes the `pi-interactive-subagents` tools it needs.

Recommended setup:
- install `pi-interactive-subagents` globally
- install `pi-ticket-flow` project-locally with `pi install -l ...`

If you also install `git:github.com/HazAT/pi-interactive-subagents` as a separate pi package, pi can report duplicate tool registrations such as `subagent`, `subagents_list`, `set_tab_title`, `subagent_resume`, `write_artifact`, and `read_artifact`.

`pi-ticket-flow` now avoids re-registering those tools when `pi-interactive-subagents` is already configured as its own pi package, so this works even when package load order is unfavorable.

Example settings split:

`~/.pi/agent/settings.json`

```json
{
  "packages": [
    "git:github.com/HazAT/pi-interactive-subagents"
  ]
}
```

`.pi/settings.json`

```json
{
  "packages": [
    "git:github.com/legout/pi-ticket-flow"
  ]
}
```

After changing package scope, run `/reload`.

## Skills

Planning skills:
- `brainstorm` — interactive divergent brainstorming
- `architect` — create/update ARCHITECTURE.md
- `execplan-create` — self-contained ExecPlan creation following PLANS.md spec
- `execplan-improve` — 7-criteria audit with Ousterhout lens and usefulness scoring
- `ticketize` — ExecPlan milestones to dependency-aware tk tickets with ExecPlan references and scheduling hints
- `update-architecture` — post-implementation architecture sync

Workflow skills:
- `ticket-flow`
- `ticket-implement` — implement the currently selected ticket using the base worker agent
- `ticket-test-fix` — validate and fix the currently selected ticket using the base worker agent
- `ticket-review` — review the currently selected ticket using the base reviewer agent

## Workflow model

### Single-ticket workflow

`/ticket-flow` processes **exactly one ticket per invocation**.

High-level flow:
1. pick a ticket
2. delegate implementation to a fresh worker
3. delegate validation/fix-to-green to a fresh worker
4. delegate review to a fresh reviewer
5. close on PASS, retry on REVISE up to 3 times, then ESCALATE

### Queue workflow

`/ticket-queue` processes tickets sequentially.

Default behavior:
- run until `tk ready` has no eligible tickets left

Optional behavior:
- pass `--loop N` to cap how many tickets are processed in one invocation

## State contract

### Planning docs (repo files, git-tracked)

- `.ticket-flow/plans/<topic-slug>/brainstorm.md` — brainstorming output
- `.ticket-flow/plans/<topic-slug>/execplan.md` — ExecPlan (living document)
- `ARCHITECTURE.md` — project architecture doc

Planning docs are repo files so they sync across machines. Commit them to git.

Recommended workflow guidance files:

- `.ticket-flow/AGENTS.md` — pi-ticket-flow, tk, and ExecPlan instructions for the project
- `.ticket-flow/PLANS.md` — the ExecPlan authoring spec used by planning prompts and skills
- `AGENTS.md` — should reference `.ticket-flow/AGENTS.md`

### Session artifacts (ephemeral)

Artifacts used by the workflow:
- `ticket-flow/invocation.md`
- `ticket-flow/current.md`
- `ticket-flow/<ticket-id>/implementation-<run-token>.md`
- `ticket-flow/<ticket-id>/validation-<run-token>.md`
- `ticket-flow/<ticket-id>/review-<run-token>.md`
- `ticket-flow/progress.md`
- `ticket-flow/lessons-learned.md`

## Notes

- `/plan` is the preferred entry point for new features — it handles brainstorming then delegates to `/plan-chain`.
- `/plan-and-build` is the power-user shortcut: plan → ticketize → queue, all in one command.
- `/ticket-flow` is the preferred single-ticket path.
- `/ticket-queue` is the preferred multi-ticket loop.
- `/review-deep` is the higher-confidence path for non-ticket code review when you want multiple independent review lenses plus final consolidation.
- `/ticket-review-deep` is the optional manual high-confidence ticket review path using parallel review passes plus final consolidation.
- `/bridge-smoke` is the first thing to run after install.
