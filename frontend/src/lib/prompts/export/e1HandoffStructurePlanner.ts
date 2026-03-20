import type {
  ExportPlannerPromptPayload,
  PromptVersion,
} from "../types";
import {
  formatExportDateTime,
  toExportTranscript,
} from "./shared";

const PHASE1_SKILL_IDS = [
  "skill:artifact_extraction",
  "skill:decision_extraction",
  "skill:user_constraints",
  "skill:theoretical_context",
  "skill:data_reference",
  "skill:unresolved_next_steps",
] as const;

const PHASE1_SKILL_ID_LINES = PHASE1_SKILL_IDS.map((id) => `- ${id}`).join("\n");

const E1_HANDOFF_SYSTEM = `You are Vesti's E1 structure planner for AI handoff.

Your job is to read one export dataset and produce structured planning notes that tell E2 what must be preserved for execution continuity.

This is not the final handoff markdown.
Do not write prose sections such as ## Background or ## Decisions And Answers.

Output one JSON object only with these exact top-level keys:
- schemaVersion
- mode
- datasetId
- focusSummary
- inclusionRules
- exclusionRules
- riskFlags
- requiredSkills
- baselineTriggered
- taskFrame
- artifactDensity
- decisionDensity
- unresolvedDensity
- handoffFocus

Allowed density values are only:
- "low"
- "medium"
- "high"

Hard rules:
1) Use only grounded evidence from the supplied dataset.
2) Optimize for continuation by the next agent or engineer, not for human-friendly summary prose.
3) Favor preservation of decisions, decision rationale, concrete artifacts, and unresolved work.
4) Treat medium/high signals as stronger inclusion hints. Treat low-confidence signals only as prompts to verify against the transcript, not as facts by themselves.
5) If evidence is sparse, keep the JSON shape and use conservative values instead of inventing details.
6) requiredSkills and baselineTriggered may be omitted, but when present they must contain only known Phase 1 skill IDs.
7) Use [] when you want to surface the keys but no skill is justified by grounded evidence yet.
8) Output valid JSON only.`;

function formatSignalLines(
  payload: ExportPlannerPromptPayload
): string {
  const conversationLines = (payload.conversationSignals ?? []).map(
    (signal) =>
      `- ${signal.label}${signal.confidence ? ` [${signal.confidence}]` : ""}${
        signal.note ? `: ${signal.note}` : ""
      }`
  );
  const messageLines = (payload.messageSignals ?? []).map(
    (signal) =>
      `- ${signal.label}${signal.targetId ? ` @${signal.targetId}` : ""}${
        signal.confidence ? ` [${signal.confidence}]` : ""
      }${signal.note ? `: ${signal.note}` : ""}`
  );

  const conversationBlock =
    conversationLines.length > 0
      ? conversationLines.join("\n")
      : "- (none)";
  const messageBlock =
    messageLines.length > 0
      ? messageLines.join("\n")
      : "- (none)";

  return `Conversation-level signals:
${conversationBlock}

Message-level signals:
${messageBlock}`;
}

function buildE1HandoffPrompt(
  payload: ExportPlannerPromptPayload
): string {
  return `Produce planning notes for handoff extraction.

Dataset metadata:
- datasetId: ${payload.datasetId}
- Title: ${payload.conversationTitle || "(untitled)"}
- Platform: ${payload.conversationPlatform || "unknown"}
- StartedAt: ${
    payload.conversationOriginAt
      ? formatExportDateTime(payload.conversationOriginAt)
      : "unknown"
  }
- Locale: ${payload.locale || "zh"}
- MessageCount: ${payload.messages.length}

Upstream signals:
${formatSignalLines(payload)}

Transcript:
${toExportTranscript(payload.messages)}

Planning requirements:
1) focusSummary should explain, in 1-2 sentences, what the next agent most needs to preserve.
2) inclusionRules should list what E2 must keep even if compression pressure is high.
3) exclusionRules should list what E2 may safely avoid repeating unless later turns depend on it.
4) riskFlags should call out missing evidence, unstable assumptions, or places where chronology matters.
5) requiredSkills should list only known Phase 1 skill IDs when the transcript justifies planning-level activation:
${PHASE1_SKILL_ID_LINES}
6) baselineTriggered should contain only grounded skill IDs that are directly forced by implemented upstream P1 cues.
7) Use [] when no grounded skill should be surfaced yet.
8) taskFrame should describe the current task boundary and key constraints.
9) handoffFocus should be 3-5 compact bullets naming the decision, artifact, and unresolved areas that most directly affect continuation.
10) Use medium/high signals to prioritize inclusion; use low-confidence signals only when the transcript itself supports them.
11) Set decisionDensity and unresolvedDensity based on the actual thread, not on desired output size.
12) Output valid JSON only.`;
}

function buildE1HandoffFallbackPrompt(
  payload: ExportPlannerPromptPayload
): string {
  return `Return a conservative JSON planning object for handoff extraction.

Use the exact keys required by the system prompt.
If evidence is sparse:
- keep schemaVersion as "v1"
- keep mode as "handoff"
- keep datasetId as "${payload.datasetId}"
- use conservative density values
- keep requiredSkills and baselineTriggered as [] unless a known Phase 1 skill is clearly grounded
- keep arrays non-empty only when grounded evidence exists

Transcript:
${toExportTranscript(payload.messages)}`;
}

export const DRAFT_EXPORT_E1_HANDOFF_STRUCTURE_PLANNER_PROMPT: PromptVersion<ExportPlannerPromptPayload> = {
  version: "v0.1.1-export-e1-handoff-phase1-skill-planning",
  createdAt: "2026-03-18",
  description:
    "Dormant E1 handoff planner prompt draft with Phase 1 planning visibility for requiredSkills and baselineTriggered. Not wired into runtime.",
  system: E1_HANDOFF_SYSTEM,
  fallbackSystem: "You are a conservative JSON planner. Output one JSON object only.",
  userTemplate: buildE1HandoffPrompt,
  fallbackTemplate: buildE1HandoffFallbackPrompt,
};
