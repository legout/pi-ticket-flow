import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import registerSessionArtifacts from "../node_modules/pi-interactive-subagents/pi-extension/session-artifacts/index.ts";
import { hasConfiguredInteractiveSubagentsPackage } from "./interactive-subagents-detection.ts";

const TOOL_NAMES = ["write_artifact", "read_artifact"] as const;

export default function registerBundledSessionArtifacts(pi: ExtensionAPI) {
  if (hasConfiguredInteractiveSubagentsPackage()) {
    return;
  }

  const existing = new Set(pi.getAllTools().map((tool) => tool.name));
  const conflicts = TOOL_NAMES.filter((name) => existing.has(name));

  if (conflicts.length > 0) {
    return;
  }

  registerSessionArtifacts(pi);
}
