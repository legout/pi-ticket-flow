---
description: Internal deep review pass — correctness and logic
model: openai-codex/gpt-5.4-mini
subagent: reviewer
inheritContext: true
skill: review
restore: true
---
Perform a deep code review for: $@

Focus only on:
- correctness
- logic mismatches between intent and implementation
- concrete edge-case bugs
- real error-handling failures

Do not modify code.
Do not try to produce the final consolidated review.
Be strict about real issues only.

Output exactly this structure:

```md
# Candidate Review
lens: correctness
verdict: APPROVED | NEEDS CHANGES

## Summary
- <1-2 sentence verdict>

## Findings

- none
```

If there are findings, replace `## Findings` with repeated sections:

```md
## Findings

### [P0|P1|P2|P3] Short title
**File:** `path/to/file`
**Issue:** <concrete problem>
**Suggested Fix:** <specific remediation>
```

Only include findings you can support from the code or commands you actually inspected.
