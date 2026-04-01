import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export interface RuntimeAgent {
  name: string;
  description?: string;
  model?: string;
  source: "project" | "global" | "package";
  path: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!parsed) continue;
    result[parsed[1]] = parsed[2].trim();
  }
  return result;
}

function packageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function scanAgentDir(dir: string, source: RuntimeAgent["source"]): RuntimeAgent[] {
  if (!existsSync(dir)) return [];
  const agents: RuntimeAgent[] = [];
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith(".md"))) {
    const fullPath = join(dir, file);
    const content = readFileSync(fullPath, "utf8");
    const fields = parseFrontmatter(content);
    const name = fields["name"] ?? file.replace(/\.md$/, "");
    if (!name) continue;
    agents.push({
      name,
      description: fields["description"],
      model: fields["model"],
      source,
      path: fullPath,
    });
  }
  return agents;
}

function candidateDirs(cwd: string, scope: "user" | "project" | "both") {
  const dirs: Array<{ dir: string; source: RuntimeAgent["source"] }> = [
    { dir: join(packageRoot(), "agents"), source: "package" },
  ];
  if (scope === "user" || scope === "both") {
    dirs.push({ dir: join(homedir(), ".pi", "agent", "agents"), source: "global" });
  }
  if (scope === "project" || scope === "both") {
    dirs.push({ dir: join(cwd, ".pi", "agents"), source: "project" });
  }
  return dirs;
}

export function discoverAgents(cwd: string, scope: "user" | "project" | "both") {
  const byName = new Map<string, RuntimeAgent>();
  for (const { dir, source } of candidateDirs(cwd, scope)) {
    for (const agent of scanAgentDir(dir, source)) {
      byName.set(agent.name, agent);
    }
  }
  return { agents: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
