import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { artifactPaths } from "./ticket-flow-tools.ts";

export interface DelegatedTicketFlowRecoveryInput {
  artifactDir: string;
  skill?: string;
  errorText?: string;
}

export interface DelegatedTicketFlowRecoveryResult {
  summary: string;
  artifactPath: string;
}

function parseSkillList(skill?: string): string[] {
  if (!skill) return [];
  return skill.split(",").map((s) => s.trim()).filter(Boolean);
}

function determineStep(skills: string[]): "implement" | "validate" | "review" | undefined {
  if (skills.some((s) => s.includes("ticket-implement"))) return "implement";
  if (skills.some((s) => s.includes("ticket-test-fix"))) return "validate";
  if (skills.some((s) => s.includes("ticket-review"))) return "review";
  return undefined;
}

function isArtifactValid(
  content: string,
  ticket: string,
  step: string,
  expectedStatus: string,
  sourceArtifact: string,
): boolean {
  const lines = content.split("\n");
  let foundTicket = false;
  let foundStep = false;
  let foundStatus = false;
  let foundSource = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === `ticket: ${ticket}`) foundTicket = true;
    if (trimmed === `step: ${step}`) foundStep = true;
    if (trimmed === `status: ${expectedStatus}`) foundStatus = true;
    if (trimmed === `source_artifact: ${sourceArtifact}`) foundSource = true;
  }

  return foundTicket && foundStep && foundStatus && foundSource;
}

function synthesizeArtifact(
  step: "implement" | "validate" | "review",
  ticket: string,
  errorText: string,
  sourceArtifact: string,
): string {
  const title = step === "implement"
    ? "Implementation Result"
    : step === "validate"
    ? "Validation Result"
    : "Review Result";
  const status = step === "review" ? "revise" : "blocked";
  return `# ${title}

ticket: ${ticket}
step: ${step}
status: ${status}
source_artifact: ${sourceArtifact}

## Summary

Delegated ${step} step failed and was recovered by the orchestrator bridge.

## Files Changed

none — step did not complete

## Evidence

Recovery artifact: the delegated worker was aborted before writing its own artifact.
Reason: ${errorText}

## Remaining Issues

${errorText}
`;
}

export function recoverDelegatedTicketFlowFailure(
  input: DelegatedTicketFlowRecoveryInput,
): DelegatedTicketFlowRecoveryResult | undefined {
  const { artifactDir, skill, errorText = "Unknown error" } = input;
  const skills = parseSkillList(skill);
  const step = determineStep(skills);
  if (!step) return undefined;

  const handoffPath = join(artifactDir, "ticket-flow", "handoff.json");
  if (!existsSync(handoffPath)) return undefined;

  let handoff: { ticket?: string; run_token?: string };
  try {
    handoff = JSON.parse(readFileSync(handoffPath, "utf8"));
  } catch {
    return undefined;
  }

  const ticket = handoff.ticket;
  const runToken = handoff.run_token;
  if (!ticket || !runToken) return undefined;

  const paths = artifactPaths(ticket, runToken);
  const expectedPath = paths[step === "implement" ? "implementation" : step === "validate" ? "validation" : "review"];
  const absolutePath = join(artifactDir, expectedPath);

  const sourceArtifact = step === "validate"
    ? paths.implementation
    : step === "review"
    ? paths.validation
    : "none";

  if (existsSync(absolutePath)) {
    try {
      const content = readFileSync(absolutePath, "utf8");
      const expectedStatus = step === "review" ? "revise" : "blocked";
      if (isArtifactValid(content, ticket, step, expectedStatus, sourceArtifact)) {
        return {
          summary: `Recovered delegated ${step} step. Existing valid artifact preserved: ${expectedPath}`,
          artifactPath: expectedPath,
        };
      }
    } catch {
      // malformed or unreadable, will synthesize below
    }
  }

  const content = synthesizeArtifact(step, ticket, errorText, sourceArtifact);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");

  const synthesizedStatus = step === "review" ? "revise" : "blocked";
  return {
    summary: `Recovered delegated ${step} step. Wrote ${step} artifact (${synthesizedStatus}): ${expectedPath}`,
    artifactPath: expectedPath,
  };
}
