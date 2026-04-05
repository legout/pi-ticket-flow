---
description: Full planning pipeline - brainstorm if needed, then create and improve an ExecPlan
model: kimi-coding/k2p5, anthropic/claude-sonnet-4-20250514
thinking: high
restore: true
---

If `$@` is empty, ask the user for a topic before proceeding.

Plan this topic end-to-end: $@

This command is a smart orchestrator, not a pure chain, because brainstorming is interactive and should only run if no brainstorm exists yet.

Because nested prompt execution may not be available, manually load and follow the installed `brainstorm`, `architect`, `execplan-create`, and `execplan-improve` skills directly within this command when needed.

## Procedure

### Step 1: Brainstorm check

1. Derive the topic slug from `$@` (kebab-case, lowercase, max 40 chars).
2. Check if `.ticket-flow/plans/<topic-slug>/brainstorm.md` exists.
3. If it does not exist, run an interactive brainstorming session for `$@`, then write the brainstorm file.
4. If it does exist, report that the brainstorm already exists and continue.

### Step 2: Continue with the non-interactive planning pipeline

After the brainstorm exists, continue by following the same steps as `/plan-chain $@`:
1. Create or update `ARCHITECTURE.md`
2. Create `.ticket-flow/plans/<topic-slug>/execplan.md`
3. Improve the ExecPlan until the improvement loop converges

Perform those three steps directly by following the corresponding installed skills and prompt instructions instead of assuming nested prompt execution.

### Step 3: Finish

Report the final plan location and suggest running `/ticketize $@` to create tickets.
