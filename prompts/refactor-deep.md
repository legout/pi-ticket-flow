---
description: Deep refactoring analysis — broader search radius, stronger reasoning, and optional external research
model: openai-codex/gpt-5.4
thinking: xhigh
subagent: change-planner
inheritContext: true
skill: refactor
restore: true
---
$@

Deep mode instructions:
- Broaden the search radius beyond the immediately named files into adjacent modules, interfaces, tests, config, and shared helpers.
- Prefer fewer, higher-value refactoring opportunities over many minor suggestions.
- If the refactoring depends materially on framework, library, platform, or API behavior, first check whether a `researcher` subagent is available via `subagents_list`. If available, spawn it and use the results before presenting recommendations.
- Be especially explicit about risk, sequencing, and verification.
