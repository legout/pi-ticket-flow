---
description: Internal deep review pass — regressions and compatibility risk
model: kimi-coding/k2p5
subagent: reviewer
inheritContext: true
skill: review
restore: true
---
Perform a deep code review for: $@

Focus only on:
- regression risk
- interface and contract changes
- behavioral compatibility
- downstream breakage and integration hazards

Do not modify code.
Do not try to produce the final consolidated review.
Be strict about real issues only.

Output exactly this structure:

```md
# Candidate Review
lens: regression
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
