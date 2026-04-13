---
id: ptf-7o9t
status: closed
deps: []
links: []
created: 2026-04-13T09:08:58Z
type: task
priority: high
assignee: legout
---
# Collapse dual state (invocation.json + current.json) into single state.json


## Notes

**2026-04-13T15:01:05Z**

Gate: REVISE — Review Attempt: 1/3 — ticket-pick.md overwrites state.json before checking for stale/legacy state, so the startup guard can no longer detect an active or migrated run. Fix: move stale-state and legacy-state checks before the sentinel write.

**2026-04-13T15:13:59Z**

Gate: PASS — dual-state collapsed into single state.json, startup guard regression fixed, all smoke tests pass
