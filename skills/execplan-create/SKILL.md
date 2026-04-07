---
name: execplan-create
description: >
  Create a self-contained ExecPlan from a brainstorm artifact and/or a user
  brief. Follows the project's .ticket-flow/PLANS.md spec. Applies the
  Ousterhout design lens. Use when creating execution plans, turning ideas
  into implementable steps, or wants a PRD/RFC/brainstorm turned into a
  step-by-step plan.
---

# ExecPlan Authoring

Write plans the way a strong software designer would: not as a task list for rearranging code, but as a path to a simpler system with clearer boundaries.

## Required inputs

- The user must provide a topic, or a brainstorm must exist at `.ticket-flow/plans/<topic-slug>/brainstorm.md`.
- `.ticket-flow/PLANS.md` must exist and be read in full before drafting.
- If no topic and no brainstorm exists, ask the user for a topic before proceeding.
- If `.ticket-flow/PLANS.md` is missing, tell the user to run `/ticket-flow-init` first and stop.

## Source of truth

- Read `.ticket-flow/PLANS.md` in full before drafting and follow it exactly.
- If any instruction conflicts with this skill, `.ticket-flow/PLANS.md` wins.

## Topic resolution

1. If the user provides a topic argument, convert it to `<topic-slug>` (kebab-case, lowercase) before resolving planning paths.
2. If no argument, scan `.ticket-flow/plans/` for directories containing `brainstorm.md` but no `execplan.md`. If exactly one match, use that directory name as `<topic-slug>`.
3. If multiple matches, list them and ask the user which to plan.
4. If no matches, ask the user for a topic.

## Ousterhout lens

Use John Ousterhout's design philosophy as the default planning lens:

- prefer deep modules over shallow wrappers
- prefer interfaces that hide sequencing and policy
- prefer fewer concepts and fewer special cases
- prefer simpler mental models over elegant-looking decomposition
- prefer concentrating complexity behind a stable boundary over spreading it around

Treat these as the main forms of complexity:

- change amplification
- cognitive load
- unknown unknowns

When authoring a plan, answer these questions explicitly in the plan's prose:

- what complexity exists today, and who pays for it
- what boundary or interface becomes simpler after this work
- what knowledge moves out of callers and into the implementation
- what special cases, duplicate concepts, or orchestration steps disappear
- what future change becomes easier after this work

Reject plan shapes that mainly add new layers, knobs, or abstraction names without hiding more detail.

## Milestone shaping for ticketization

Author milestones so they convert cleanly into high-quality tickets later.

- Prefer **vertical slices** by default: each milestone should ideally deliver an observable, end-to-end behavior slice that can be implemented, validated, reviewed, and merged on its own.
- A good milestone usually answers: what new behavior exists after this step, how do we observe it, and why can it land without waiting for several sibling milestones.
- Use **horizontal milestones** only when they are clearly justified as one of: `enabler`, `migration`, `prototype`, or `cleanup`.
- When a horizontal milestone is necessary, say so explicitly in the prose and explain why it must precede or follow other work.
- Make milestone dependencies explicit in the plan prose. Name true prerequisites, note which milestones can proceed in parallel, call out related-but-non-blocking work, and identify conflict boundaries / serialization points such as schema changes, shared public interfaces, registries, package manifests, or central configuration.
- Avoid long layer-by-layer sequences when smaller independently verifiable slices are possible.
- Keep the plan prose-first and OpenAI-compatible: do not turn milestones into rigid forms or tables just to support ticketization.

## Output location

- Write the ExecPlan to `.ticket-flow/plans/<topic-slug>/execplan.md` in the target repo.
- If `.ticket-flow/plans/<topic-slug>/` does not exist, create it before writing the file.
- The `<topic-slug>` is derived from the user's topic (kebab-case, lowercase).

## Format rules

- Because `execplan.md` contains only the ExecPlan, do not wrap it in outer triple backticks.

## Authoring workflow

1. Read `.ticket-flow/PLANS.md` in full and keep it as the primary authoring contract.
2. Read the brainstorm (if it exists at `.ticket-flow/plans/<topic-slug>/brainstorm.md`) and identify the concrete outcomes, acceptance criteria, hard constraints, and any soft guidance about scope or risk.
3. Read `ARCHITECTURE.md` (if it exists at the project root) for architectural context.
4. **Scout the codebase** — spawn a scout to map the relevant area before drafting:
   ```
   subagent({ name: "Scout", agent: "scout", task: "Map the codebase area relevant to the planned change. Identify file structure, patterns, conventions, dependencies, coupling, and the likely files/boundaries affected." })
   ```
   Wait for the scout's results before proceeding.
5. Inspect the repo to understand the relevant files, current flows, and the complexity being paid today. Ask: what do callers currently need to know, where does sequencing leak, where are concepts duplicated, and where do special cases accumulate.
6. Decide the plan shape that most reduces system complexity while still satisfying the request. Prefer the path that creates a simpler interface or a deeper owned module, not the one that merely redistributes logic.
7. Shape the milestones so they are independently verifiable and ticket-ready. Prefer vertical slices; use explicit enabler/migration/cleanup/prototype milestones only when they materially reduce risk or unlock later slices.
8. Draft the ExecPlan using `.ticket-flow/PLANS.md` exactly. Name the exact files and boundaries involved, explain the current pain, describe the complexity dividend the change is intended to produce, and make dependencies / parallelism constraints / soft links / conflict boundaries explicit in milestone prose.
9. Ensure required sections exist and are self-contained, novice-friendly, behavior-focused, and explicit about why the design is simpler after the change.
10. Save to `.ticket-flow/plans/<topic-slug>/execplan.md`.

## Anti-patterns

- Do not write a mechanically correct plan that preserves the same complexity under new names.
- Do not decompose the work into long horizontal phases when smaller independently verifiable slices are feasible.
- Do not propose thin wrappers or pass-through modules unless the plan can explain exactly what detail they hide.
- Do not leave key design choices to the implementer when the repo evidence is strong enough to decide now.
- Do not leave milestone dependencies, soft links, or conflict boundaries implicit when the plan already knows which steps are true prerequisites, merely related, or unsafe to parallelize.
- Do not fall back to an embedded or remembered PLANS spec; if `.ticket-flow/PLANS.md` is missing, stop.
