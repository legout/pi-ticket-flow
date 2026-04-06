---
description: Deep simplification analysis — wider complexity scan, stronger reasoning, and optional external research
model: openai-codex/gpt-5.4
thinking: xhigh
subagent: change-planner
inheritContext: true
skill: simplify
restore: true
---
$@

Deep mode instructions:
- Broaden the scan into adjacent modules, tests, configuration, and call paths so simplification opportunities are not missed.
- Prefer simplifications that reduce cognitive load and special cases, not just line count.
- If the simplification depends materially on framework, library, platform, or API behavior, first check whether a `researcher` subagent is available via `subagents_list`. If available, spawn it and use the results before presenting recommendations.
- Be especially explicit about before/after mental model, blast radius, and verification.
