# Vendored pi-prompt-template-model

This directory vendors the `pi-prompt-template-model` runtime used by `pi-ticket-flow`.

Why this fork exists:
- delegated prompt execution needs to forward prompt `skill` metadata to the bridge so base `worker` / `reviewer` agents can be specialized by prompt frontmatter
- delegated prompt `thinking` must survive the prompt → bridge handoff
- `pi-ticket-flow` relies on these behaviors for prompts like `/ticket-implement`, `/ticket-test-fix`, and `/ticket-review`

Local compatibility patches are currently in:
- `subagent-runtime.ts`
- `subagent-step.ts`

When updating from upstream, re-apply those compatibility changes intentionally.
