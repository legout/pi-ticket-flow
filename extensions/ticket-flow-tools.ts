import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function runTk(cwd: string, args: string[]) {
  return execFileSync("tk", args, { encoding: "utf8", cwd });
}

function parseListField(raw: string | undefined) {
  const value = raw?.trim();
  if (!value || value === "[]") return [] as string[];
  const match = value.match(/^\[(.*)\]$/s);
  if (!match) return [] as string[];
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseHeader(text: string) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields: Record<string, string> = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const fieldMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    fields[key] = rawValue.trim();
  }
  return fields;
}

function extractSection(text: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |\\Z)`, "m"));
  return match?.[1]?.trim() ?? "";
}

function parseTicketListSection(text: string, heading: string) {
  const section = extractSection(text, heading);
  if (!section) return [] as Array<{ ticket: string; status: string }>;
  const items: Array<{ ticket: string; status: string }> = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^-\s+([a-z0-9-]+)\s+\[([^\]]+)\]/i);
    if (!match) continue;
    items.push({ ticket: match[1], status: match[2] });
  }
  return items;
}

function parseReady(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const items: Array<{ ticket: string; listedStatus: string; line: string }> = [];
  for (const line of lines) {
    const match = line.match(/^([a-z0-9-]+)\s+\[[^\]]+\]\[([^\]]+)\]/i);
    if (!match) continue;
    items.push({ ticket: match[1], listedStatus: match[2], line });
  }
  return items;
}

function artifactPaths(ticket: string, runToken: string) {
  return {
    implementation: `ticket-flow/${ticket}/implementation-${runToken}.md`,
    validation: `ticket-flow/${ticket}/validation-${runToken}.md`,
    review: `ticket-flow/${ticket}/review-${runToken}.md`,
  };
}

function newRunToken() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function getTicketStatus(cwd: string, ticket: string, cache: Map<string, string>) {
  if (cache.has(ticket)) return cache.get(ticket)!;
  try {
    const text = runTk(cwd, ["show", ticket]);
    const header = parseHeader(text);
    const status = header.status ?? "unknown";
    cache.set(ticket, status);
    return status;
  } catch {
    cache.set(ticket, "missing");
    return "missing";
  }
}

function inspectTicket(cwd: string, ticket: string, cache: Map<string, string>) {
  const text = runTk(cwd, ["show", ticket]);
  const header = parseHeader(text);
  const deps = parseListField(header.deps);
  const children = parseTicketListSection(text, "Children");
  const blockers = parseTicketListSection(text, "Blockers");
  const dependencyStatuses = deps.map((dep) => ({ ticket: dep, status: getTicketStatus(cwd, dep, cache) }));
  const unmetDependencies = dependencyStatuses.filter((dep) => dep.status !== "closed");
  const openishChildren = children.filter((child) => child.status === "open" || child.status === "in_progress");
  const hasEscalate = /Gate:\s*ESCALATE/.test(text);
  const type = header.type ?? "task";
  const reasons: string[] = [];
  if (type === "epic") reasons.push("epic");
  if (hasEscalate) reasons.push("escalated");
  if (openishChildren.length > 0) reasons.push("open-children");
  if (unmetDependencies.length > 0) reasons.push("unmet-dependencies");

  return {
    ticket,
    ticketPath: existsSync(join(cwd, ".tickets", `${ticket}.md`)) ? `.tickets/${ticket}.md` : null,
    status: header.status ?? "unknown",
    type,
    deps,
    blockers,
    dependencyStatuses,
    unmetDependencies,
    children,
    openishChildren,
    hasEscalate,
    eligible: reasons.length === 0,
    reasons,
  };
}

function selectTicket(cwd: string) {
  const readyOutput = runTk(cwd, ["ready"]);
  const ready = parseReady(readyOutput);
  if (ready.length === 0) {
    return { outcome: "none-ready", ready: [], selected: null, skipped: [] };
  }

  const prioritized = [
    ...ready.filter((item) => item.listedStatus === "in_progress"),
    ...ready.filter((item) => item.listedStatus !== "in_progress"),
  ];

  const skipped: Array<{ ticket: string; reasons: string[]; dependencyStatuses: Array<{ ticket: string; status: string }> }> = [];
  const cache = new Map<string, string>();
  for (const item of prioritized) {
    const inspected = inspectTicket(cwd, item.ticket, cache);
    if (inspected.eligible) {
      return {
        outcome: "selected",
        ready,
        selected: {
          ticket: inspected.ticket,
          ticketPath: inspected.ticketPath,
          currentStatus: inspected.status,
          listedStatus: item.listedStatus,
        },
        skipped,
      };
    }
    skipped.push({ ticket: item.ticket, reasons: inspected.reasons, dependencyStatuses: inspected.dependencyStatuses });
  }

  return { outcome: "no-eligible", ready, selected: null, skipped };
}

function asText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function registerTicketFlowTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ticket_flow_new_run_token",
    label: "Ticket Flow Run Token",
    description: "Generate a deterministic UTC run token for ticket-flow state.",
    promptSnippet: "Generate a ticket-flow run token.",
    parameters: Type.Object({}),
    async execute() {
      const runToken = newRunToken();
      return {
        content: [{ type: "text", text: runToken }],
        details: { runToken },
      };
    },
  });

  pi.registerTool({
    name: "ticket_flow_artifact_paths",
    label: "Ticket Flow Artifact Paths",
    description: "Derive implementation, validation, and review artifact paths from a ticket id and run token.",
    promptSnippet: "Derive ticket-flow artifact paths for a selected ticket attempt.",
    parameters: Type.Object({
      ticket: Type.String({ description: "Ticket id, e.g. flo-c9pq" }),
      runToken: Type.String({ description: "Run token, e.g. 20260410T165200Z" }),
    }),
    async execute(_toolCallId, params) {
      const result = artifactPaths((params as { ticket: string }).ticket, (params as { runToken: string }).runToken);
      return {
        content: [{ type: "text", text: asText(result) }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "ticket_flow_check_ticket",
    label: "Ticket Flow Check Ticket",
    description: "Inspect one tk ticket for leaf status, unmet dependencies, and escalation markers.",
    promptSnippet: "Check whether a tk ticket is eligible for automatic ticket-flow processing.",
    parameters: Type.Object({
      ticket: Type.String({ description: "Ticket id, e.g. flo-c9pq" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx: ExtensionContext) {
      const cache = new Map<string, string>();
      const result = inspectTicket(ctx.cwd, (params as { ticket: string }).ticket, cache);
      return {
        content: [{ type: "text", text: asText(result) }],
        details: result,
      };
    },
  });

  pi.registerTool({
    name: "ticket_flow_select",
    label: "Ticket Flow Select",
    description: "Select the next eligible tk ticket deterministically from `tk ready`, honoring escalation, leaf, and dependency checks.",
    promptSnippet: "Pick the next eligible ticket for ticket-flow processing.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx: ExtensionContext) {
      const result = selectTicket(ctx.cwd);
      return {
        content: [{ type: "text", text: asText(result) }],
        details: result,
      };
    },
  });
}
