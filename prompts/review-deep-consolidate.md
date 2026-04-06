---
description: Internal deep review consolidation step
model: openai-codex/gpt-5.4
thinking: xhigh
restore: true
---
Consolidate the parallel deep review passes that just ran for: $@

The immediately preceding chain step ran multiple independent review passes in parallel.
Use their candidate review outputs from the conversation above as the primary input.
You may inspect the diff and relevant files again if needed.

Your job:
1. merge all credible findings from the candidate reviews
2. eliminate duplicates
3. drop speculative or weak findings
4. normalize priorities
5. produce one final review

Rules:
- do not modify code
- prefer fewer, stronger findings over many weak ones
- if the candidate reviewers disagree, keep only findings you can support yourself
- if there are no material issues, approve the change

Output exactly this format:

```md
# Code Review

**Reviewed:** <brief description>
**Verdict:** APPROVED | NEEDS CHANGES

## Summary
<1-2 sentence overview>

## Findings

### [P0|P1|P2|P3] Short title
**File:** `path/to/file.ts:123`
**Issue:** <description>
**Suggested Fix:** <how to fix>

## What's Good
- <genuine positive observation>
```

If there are no findings, keep `## Findings` with a single bullet:

```md
## Findings
- none
```
