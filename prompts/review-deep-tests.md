---
description: Internal deep review pass — tests, validation, and maintainability
model: zai/glm-5.1
subagent: reviewer
inheritContext: true
skill: review
restore: true
---
Perform a deep code review for: $@

Focus only on:
- adequacy of tests and validation
- credibility of validation claims
- maintainability and clarity problems likely to cause future bugs
- unnecessary or suspicious unrelated changes

Do not modify code.
Do not try to produce the final consolidated review.
Be strict about real issues only.

Output exactly this structure:

```md
# Candidate Review
lens: tests-and-maintainability
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
