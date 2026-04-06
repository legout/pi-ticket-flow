---
description: Review code, then fix all issues found — loop until the reviewer approves
chain: review -> review-fix
loop: 3
fresh: true
converge: true
chainContext: summary
restore: true
---
Review then fix loop for: $@

This chain runs up to 3 rounds of review → review-fix. The `review` step finds issues, the `review-fix` step addresses them, and the loop stops early when a round makes no file changes.

Each round gets fresh context with a summary of previous rounds.
