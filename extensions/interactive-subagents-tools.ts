import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import registerInteractiveSubagents from "../node_modules/pi-interactive-subagents/pi-extension/subagents/index.ts";
import { hasConfiguredInteractiveSubagentsPackage } from "./interactive-subagents-detection.ts";

const TOOL_NAMES = ["subagent", "subagents_list", "set_tab_title", "subagent_resume"] as const;

export default function registerBundledInteractiveSubagents(pi: ExtensionAPI) {
  if (hasConfiguredInteractiveSubagentsPackage()) {
    return;
  }

  const existing = new Set(pi.getAllTools().map((tool) => tool.name));
  const conflicts = TOOL_NAMES.filter((name) => existing.has(name));

  if (conflicts.length > 0) {
    return;
  }

  registerInteractiveSubagents(pi);
}
