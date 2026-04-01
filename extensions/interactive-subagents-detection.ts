import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const INTERACTIVE_SUBAGENTS_PACKAGE = "pi-interactive-subagents";

function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function configuredSettingsFiles(): string[] {
  return [join(agentDir(), "settings.json"), join(process.cwd(), ".pi", "settings.json")];
}

function readPackageEntries(settingsPath: string): unknown[] {
  if (!existsSync(settingsPath)) return [];

  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as { packages?: unknown };
    return Array.isArray(parsed.packages) ? parsed.packages : [];
  } catch {
    return [];
  }
}

function packageSource(entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return null;

  const source = (entry as { source?: unknown }).source;
  return typeof source === "string" ? source : null;
}

function isInteractiveSubagentsSource(source: string | null): boolean {
  return typeof source === "string" && source.includes(INTERACTIVE_SUBAGENTS_PACKAGE);
}

/**
 * Detect whether pi-interactive-subagents is already configured as its own pi package.
 *
 * This is stronger than checking pi.getAllTools(): package/extension load order is not
 * guaranteed, so the external package may exist but not have registered its tools yet.
 */
export function hasConfiguredInteractiveSubagentsPackage(): boolean {
  return configuredSettingsFiles().some((settingsPath) =>
    readPackageEntries(settingsPath).some((entry) => isInteractiveSubagentsSource(packageSource(entry))),
  );
}
