import type {
  ExportCompressionPromptPayload,
  PromptVersion,
} from "../types";
import {
  formatExportDateTime,
  toExportTranscript,
} from "./shared";

const EXPORT_COMPACT_SYSTEM = `You are Vesti's export compaction assistant.

Your job is to compress one conversation into a high-fidelity markdown handoff for another AI or engineer who must continue the work with minimal context loss.

Output must contain these exact headings:
## Background
## Key Questions
## Decisions And Answers
## Reusable Artifacts
## Unresolved

Hard rules:
1) Use only evidence present in the provided transcript.
2) Prioritize transfer fidelity over aggressive shortening. Do not drop grounded decisions, commands, files, APIs, or next-step context just to be shorter.
3) Preserve concrete details such as filenames, function names, shell commands, URLs, APIs, and code blocks when grounded.
4) Keep chronological logic intact: if a later decision depends on earlier context, make that dependency explicit.
5) If a section has no grounded evidence, write a conservative placeholder instead of inventing details.
6) Respect the requested locale.
7) Output markdown only. Do not wrap the whole answer in code fences.
8) If the transcript contains reusable code or command snippets, preserve them in markdown-friendly form rather than paraphrasing them away.`;

const COMPACT_DECISION_EXEMPLAR = `Example section anchor (illustrative shape only, not literal content):
## Decisions And Answers
- Decision: Keep selection state local to TimelinePage.
  Answer: Add a one-shot guard so overflow Select enters batch mode without opening Reader.
  Rationale: This preserves normal card activation while isolating menu-driven selection.`;

const COMPACT_ARTIFACT_EXEMPLAR = `## Reusable Artifacts
- Path: frontend/src/sidepanel/pages/TimelinePage.tsx
- API/Function: handleSelectFromMenu(...)
- Command: pnpm -C frontend build`;

function buildCompactPrompt(payload: ExportCompressionPromptPayload): string {
  const isStepProfile = payload.profile === "step_flash_concise";
  const brevityRule = isStepProfile
    ? "Keep bullets concise and prioritize grounded artifacts over narrative polish."
    : "Preserve the full implementation trail when it is grounded, even if the output becomes longer.";

  return `Create a high-fidelity export handoff for this conversation.

Metadata:
- Title: ${payload.conversationTitle || "(untitled)"}
- Platform: ${payload.conversationPlatform || "unknown"}
- StartedAt: ${
    payload.conversationOriginAt
      ? formatExportDateTime(payload.conversationOriginAt)
      : "unknown"
  }
- Locale: ${payload.locale || "zh"}
- MessageCount: ${payload.messages.length}

Transcript:
${toExportTranscript(payload.messages)}

Output requirements:
1) Use the exact headings listed in the system prompt.
2) Optimize for AI handoff, not for skimming: preserve background, key asks, decisions, constraints, artifacts, and unresolved work.
3) In ## Background, include the task frame, constraints, and any context another assistant would need before acting.
4) In ## Key Questions, keep only the questions that actually drove the work forward.
5) In ## Decisions And Answers, capture grounded resolutions, chosen paths, and short rationales when the transcript supports them.
6) In ## Reusable Artifacts, preserve filenames, commands, APIs, functions, and code blocks when grounded.
7) In ## Unresolved, call out what remains open, risky, or needs continuation.
8) ${brevityRule}
9) If evidence is sparse, keep the structure and use conservative placeholders.
10) Write the final output in ${payload.locale === "en" ? "natural English" : "natural Chinese"}.
11) Output markdown only.

Section anchors:
- Chronology matters here only when it helps the next agent reconstruct decision causality and execution state.
- Use this shape for grounded decisions:
${COMPACT_DECISION_EXEMPLAR}
- Use this shape for grounded reusable artifacts:
${COMPACT_ARTIFACT_EXEMPLAR}`;
}

function buildCompactFallbackPrompt(
  payload: ExportCompressionPromptPayload
): string {
  const fallbackNote =
    payload.profile === "step_flash_concise"
      ? "Prefer fewer bullets, but keep the contract safer: preserve grounded files, commands, APIs, and unresolved work."
      : "Prefer a conservative, contract-safe handoff: preserve grounded files, commands, APIs, code, and unresolved work whenever they appear.";

  return `Write a conservative fallback markdown handoff for this conversation.
You must keep these exact headings:
## Background
## Key Questions
## Decisions And Answers
## Reusable Artifacts
## Unresolved

The fallback goal is higher compliance, not freer rewriting.
If evidence is thin, use conservative placeholders rather than dropping headings.
${fallbackNote}
Use ${payload.locale === "en" ? "English" : "Chinese"}.
Output markdown only.

Safe anchors:
## Background
- Task: <grounded task or thread goal>
- Status/Constraint: <grounded current state, blocker, or key constraint>

## Key Questions
- <grounded driving question or conservative placeholder>

## Decisions And Answers
- Decision: <grounded decision>
  Answer: <chosen path>
  Rationale: <short grounded reason or conservative placeholder>

## Reusable Artifacts
- Path: <grounded file path if present>
- Command: <grounded command if present>

Transcript:
${toExportTranscript(payload.messages)}`;
}

export const CURRENT_EXPORT_COMPACT_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.2-export-compact-fallback-anchored",
  createdAt: "2026-03-18",
  description:
    "High-fidelity compact export handoff prompt with section exemplars and stronger fallback top-section anchors.",
  system: EXPORT_COMPACT_SYSTEM,
  fallbackSystem: "You are a cautious technical export assistant. Output markdown only.",
  userTemplate: buildCompactPrompt,
  fallbackTemplate: buildCompactFallbackPrompt,
};

export const EXPERIMENTAL_EXPORT_COMPACT_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.2-export-compact-fallback-anchored-exp",
  createdAt: "2026-03-18",
  description: "Experimental compact export handoff variant aligned with the current fallback-anchored prompt.",
  system: EXPORT_COMPACT_SYSTEM,
  fallbackSystem: "You are a cautious technical export assistant. Output markdown only.",
  userTemplate: buildCompactPrompt,
  fallbackTemplate: buildCompactFallbackPrompt,
};
