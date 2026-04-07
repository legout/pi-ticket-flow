---
description: Validate and fix the currently selected ticket using the base worker agent
model: zai/glm-5.1
subagent: worker
inheritContext: false
skill: ticket-test-fix
restore: true
---
Validate and fix the currently selected ticket until it is ready for review.
