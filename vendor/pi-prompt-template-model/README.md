# Vendored pi-prompt-template-model

This directory vendors the `pi-prompt-template-model` runtime used by `pi-ticket-flow`.

Why this fork exists:
- delegated prompt execution needs to forward prompt `skill` metadata to the bridge so base `worker` / `reviewer` agents can be specialized by prompt frontmatter
- delegated prompt `thinking` must survive the prompt → bridge handoff
- `pi-ticket-flow` relies on these behaviors for prompts like `/ticket-implement`, `/ticket-test-fix`, and `/ticket-review`
- this vendored copy also carries local CLI/runtime fixes that are not limited to a single file

When updating from upstream, do **not** assume only one or two files changed.
Review the diff for the entire `vendor/pi-prompt-template-model/` directory and re-apply local behavior intentionally.

In particular, local changes currently include delegated runtime behavior, argument parsing, model selection integration, UI/widget updates, and tool metadata.
