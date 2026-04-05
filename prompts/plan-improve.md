---
description: Deep-audit and improve an existing ExecPlan with code-grounded improvements
model: openai-codex/gpt-5.4-mini, zai/glm-5.1, kimi-coding/k2p5
thinking: high, high, high
skill: execplan-improve
loop: 3
rotate: true
fresh: true
converge: true
restore: true
---

Improve the ExecPlan for: $@

Use `$@` as the primary topic selector. If `$@` is empty, auto-detect from existing ExecPlans.

On each iteration, follow the execplan-improve skill workflow exactly:
- Parse the ExecPlan
- Deep-read referenced files
- Explore adjacent code
- Audit against the 7 criteria
- Rewrite only when there are substantive code-grounded improvements
- Score the usefulness of this pass

Important convergence rule:
If there are no substantive code-grounded improvements left, do not modify the ExecPlan file at all. That no-change outcome should end the loop naturally.

After each pass, report the Fixed, Added, Strengthened, and Flagged items along with the usefulness score.
If the loop converges early, the plan is ready for `/ticketize $@`.
