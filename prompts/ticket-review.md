---
description: Delegate critical ticket review to the base reviewer agent using the ticket-review workflow
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: false
skill: ticket-review
restore: true
---
Critically review the currently selected ticket.

- Use `read_artifact` / `write_artifact` for all `ticket-flow/*` workflow state.
- Review exactly the selected ticket and the matching implementation/validation artifacts.
- When writing the review artifact, use the exact lowercase contract keys `ticket:` and `gate:`.
- Do **not** substitute markdown labels like `**Reviewed:**` or `**Verdict:**` for those keys.
- Write the review artifact in this exact shape:

```md
# Review Result

ticket: <ticket-id>
gate: PASS | REVISE

## Summary

- <1-2 sentence verdict>

## Acceptance Criteria Check

- [x] <criterion met>
- [ ] <criterion not met>

## Findings

- none
```

- If there are findings, replace the Findings section with the exact heading format `### [HIGH] Short title` plus `File`, `Evidence`, and `Remediation` bullets.
- If prerequisites fail and review cannot proceed, stop cleanly and end with `<!-- CHAIN_STOP -->`.
