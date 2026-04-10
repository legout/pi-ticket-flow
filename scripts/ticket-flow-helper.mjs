#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function runTk(args) {
  return execFileSync("tk", args, { encoding: "utf8" });
}

function parseListField(raw) {
  const value = raw?.trim();
  if (!value || value === "[]") return [];
  const match = value.match(/^\[(.*)\]$/s);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseHeader(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = {};
  if (!match) return fields;
  for (const line of match[1].split("\n")) {
    const fieldMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    fields[key] = rawValue.trim();
  }
  return fields;
}

function extractSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |\\Z)`, "m"));
  return match?.[1]?.trim() ?? "";
}

function parseChildren(text) {
  const section = extractSection(text, "Children");
  if (!section) return [];
  const children = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^-\s+([a-z0-9-]+)\s+\[([^\]]+)\]/i);
    if (!match) continue;
    children.push({ ticket: match[1], status: match[2] });
  }
  return children;
}

function parseBlockers(text) {
  const section = extractSection(text, "Blockers");
  if (!section) return [];
  const blockers = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^-\s+([a-z0-9-]+)\s+\[([^\]]+)\]/i);
    if (!match) continue;
    blockers.push({ ticket: match[1], status: match[2] });
  }
  return blockers;
}

function parseReady(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const match = line.match(/^([a-z0-9-]+)\s+\[[^\]]+\]\[([^\]]+)\]/i);
    if (!match) continue;
    items.push({ ticket: match[1], listedStatus: match[2], line });
  }
  return items;
}

const statusCache = new Map();
const ticketCache = new Map();

function getTicketStatus(ticket) {
  if (statusCache.has(ticket)) return statusCache.get(ticket);
  try {
    const text = runTk(["show", ticket]);
    const header = parseHeader(text);
    const status = header.status ?? "unknown";
    statusCache.set(ticket, status);
    return status;
  } catch {
    statusCache.set(ticket, "missing");
    return "missing";
  }
}

function inspectTicket(ticket) {
  if (ticketCache.has(ticket)) return ticketCache.get(ticket);

  const text = runTk(["show", ticket]);
  const header = parseHeader(text);
  const deps = parseListField(header.deps);
  const children = parseChildren(text);
  const blockers = parseBlockers(text);
  const dependencyStatuses = deps.map((dep) => ({ ticket: dep, status: getTicketStatus(dep) }));
  const unmetDependencies = dependencyStatuses.filter((dep) => dep.status !== "closed");
  const openishChildren = children.filter((child) => child.status === "open" || child.status === "in_progress");
  const hasEscalate = /Gate:\s*ESCALATE/.test(text);
  const type = header.type ?? "task";
  const reasons = [];
  if (type === "epic") reasons.push("epic");
  if (hasEscalate) reasons.push("escalated");
  if (openishChildren.length > 0) reasons.push("open-children");
  if (unmetDependencies.length > 0) reasons.push("unmet-dependencies");

  const result = {
    ticket,
    ticketPath: existsSync(`.tickets/${ticket}.md`) ? `.tickets/${ticket}.md` : null,
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
  ticketCache.set(ticket, result);
  return result;
}

function artifactPaths(ticket, runToken) {
  return {
    implementation: `ticket-flow/${ticket}/implementation-${runToken}.md`,
    validation: `ticket-flow/${ticket}/validation-${runToken}.md`,
    review: `ticket-flow/${ticket}/review-${runToken}.md`,
  };
}

function newRunToken() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function selectTicket() {
  let readyOutput = "";
  try {
    readyOutput = runTk(["ready"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printJson({ outcome: "error", error: message });
    process.exit(1);
  }

  const ready = parseReady(readyOutput);
  if (ready.length === 0) {
    printJson({ outcome: "none-ready", ready: [], selected: null, skipped: [] });
    return;
  }

  const prioritized = [
    ...ready.filter((item) => item.listedStatus === "in_progress"),
    ...ready.filter((item) => item.listedStatus !== "in_progress"),
  ];

  const skipped = [];
  for (const item of prioritized) {
    const inspected = inspectTicket(item.ticket);
    if (inspected.eligible) {
      printJson({
        outcome: "selected",
        ready,
        selected: {
          ticket: inspected.ticket,
          ticketPath: inspected.ticketPath,
          currentStatus: inspected.status,
          listedStatus: item.listedStatus,
        },
        skipped,
      });
      return;
    }
    skipped.push({ ticket: item.ticket, reasons: inspected.reasons, dependencyStatuses: inspected.dependencyStatuses });
  }

  printJson({ outcome: "no-eligible", ready, selected: null, skipped });
}

function usage() {
  process.stderr.write(
    [
      "Usage:",
      "  node scripts/ticket-flow-helper.mjs new-run-token",
      "  node scripts/ticket-flow-helper.mjs artifact-paths <ticket> <run-token>",
      "  node scripts/ticket-flow-helper.mjs check-ticket <ticket>",
      "  node scripts/ticket-flow-helper.mjs select",
    ].join("\n") + "\n",
  );
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "new-run-token":
    process.stdout.write(`${newRunToken()}\n`);
    break;
  case "artifact-paths": {
    const [ticket, runToken] = args;
    if (!ticket || !runToken) {
      usage();
      process.exit(2);
    }
    printJson(artifactPaths(ticket, runToken));
    break;
  }
  case "check-ticket": {
    const [ticket] = args;
    if (!ticket) {
      usage();
      process.exit(2);
    }
    printJson(inspectTicket(ticket));
    break;
  }
  case "select":
    selectTicket();
    break;
  default:
    usage();
    process.exit(2);
}
