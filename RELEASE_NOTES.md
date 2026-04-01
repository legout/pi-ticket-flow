# pi-ticket-flow v0.1.0

First public release of `pi-ticket-flow`.

## Highlights

- Added canonical `ticket-*` workflow API
- Added delegated single-ticket workflow with fresh worker/reviewer subagents
- Added `/ticket-queue` for Ralph-style sequential queue processing
- Switched subagent runtime to `pi-interactive-subagents`
- Avoid duplicate subagent/artifact tool registration when `pi-interactive-subagents` is already configured separately, even if package load order is unfavorable
- Added prompt-template compatibility bridge for `subagent:` frontmatter
- Added durable workflow artifacts for state, progress tracking, and lessons learned
- Included the Python `tk-ui` board viewer for `tk`-managed `.tickets/`

## Commands

- `/ticket-flow` — delegated single-ticket workflow
- `/ticket-queue` — sequential queue workflow until no eligible tickets remain
- `/ticket-flow-chain` — alias for delegated flow
- `/ticket-step` — direct fallback workflow
- `/ticket-direct` — alias for direct fallback
- `/ticket-reset` — clear stale orchestrator state
- `/bridge-smoke` — verify delegated prompt execution

## Notes

- Use `/ticket-flow` for exactly one ticket
- Use `/ticket-queue` for multi-ticket batch processing
- Recommended install topology: `pi-interactive-subagents` global, `pi-ticket-flow` project-local
- Old `rw-*` aliases have been removed in favor of canonical `ticket-*` naming
