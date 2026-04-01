import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function sourceAgentsDir(): string {
  return join(packageRoot(), "agents");
}

function runtimeRoot(): string {
  return join(packageRoot(), "extensions", "subagent-runtime");
}

function targetAgentsDir(): string {
  return join(homedir(), ".pi", "agent", "agents");
}

function sameFileContent(a: string, b: string): boolean {
  try {
    return readFileSync(a, "utf8") === readFileSync(b, "utf8");
  } catch {
    return false;
  }
}

function installAgent(sourcePath: string, targetPath: string): void {
  try {
    symlinkSync(sourcePath, targetPath);
  } catch {
    copyFileSync(sourcePath, targetPath);
  }
}

function ensureAgentAvailable(sourcePath: string, targetPath: string): void {
  if (existsSync(targetPath)) {
    try {
      const stat = lstatSync(targetPath);
      if (stat.isSymbolicLink()) {
        const linkedPath = resolve(dirname(targetPath), readlinkSync(targetPath));
        if (linkedPath === sourcePath) return;
        if (!existsSync(linkedPath)) {
          unlinkSync(targetPath);
          installAgent(sourcePath, targetPath);
          return;
        }
      }
    } catch {
      // Fall back to content check below.
    }

    if (!sameFileContent(sourcePath, targetPath)) return;
    return;
  }

  installAgent(sourcePath, targetPath);
}

function syncPackageAgents(): void {
  const sourceDir = sourceAgentsDir();
  if (!existsSync(sourceDir)) return;

  const targetDir = targetAgentsDir();
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir).filter((name) => name.endsWith(".md"))) {
    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);
    ensureAgentAvailable(sourcePath, targetPath);
  }
}

export default function registerRwAgents(_pi: ExtensionAPI) {
  process.env.PI_SUBAGENT_RUNTIME_ROOT ??= runtimeRoot();
  syncPackageAgents();
}
