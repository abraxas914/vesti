// LLM-backed enrichment + completion for the Prompt Management feature.
//
// Every entry point degrades gracefully: when no usable LLM is configured the
// callers fall back to heuristics (extraction) or to the raw draft
// (completion). This keeps the prompt library fully functional offline.

import { z } from "zod";
import type { LlmConfig, Platform, Prompt, PromptCompletionResult } from "../types";
import { heuristicEnrichment } from "../promptlib";
import type { PromptCandidate, PromptEnrichment } from "../promptlib";
import { getLlmAccessMode, normalizeLlmSettings } from "./llmConfig";
import { getLlmSettings } from "./llmSettingsService";
import { callInference } from "./llmService";
import { logger } from "../utils/logger";

const MAX_LLM_CANDIDATES = 30;
const LLM_CHUNK_SIZE = 10;
const MAX_BODY_CHARS = 700;

/**
 * Resolve a usable LLM config without throwing. Mirrors offscreen
 * `requireSettings` validation but returns null when not configured so callers
 * can degrade gracefully.
 */
export async function resolveUsableLlmConfig(): Promise<LlmConfig | null> {
  const raw = await getLlmSettings();
  if (!raw) return null;

  const normalized = normalizeLlmSettings(raw);
  const mode = getLlmAccessMode(normalized);

  if (mode === "demo_proxy") {
    if ((!normalized.proxyBaseUrl && !normalized.proxyUrl) || !normalized.modelId) {
      return null;
    }
    return normalized;
  }

  if (!normalized.apiKey || !normalized.modelId || !normalized.baseUrl) {
    return null;
  }
  return normalized;
}

const enrichmentItemSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(280).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  category: z.string().trim().max(40).nullable().optional(),
  score: z.number().min(0).max(1).optional(),
});

const enrichmentArraySchema = z.array(enrichmentItemSchema);

const ENRICH_SYSTEM_PROMPT = `You curate a personal prompt library. For each input prompt, produce concise metadata.
Return ONLY a JSON array. Each element: {"index": <number>, "title": <short imperative title, <= 10 words>, "summary": <one sentence describing what the prompt does, or null>, "tags": <up to 5 lowercase keywords>, "category": <one of: Coding, Writing, Analysis, Translation, Summarize, Roleplay, Productivity, Other>, "score": <0..1 reusability/quality>}.
Match the language of each prompt for title/summary. Do not invent content beyond the prompt.`;

function buildEnrichUserPrompt(chunk: PromptCandidate[]): string {
  const lines = chunk.map((candidate, localIndex) => {
    const body = candidate.body.slice(0, MAX_BODY_CHARS);
    return `#${localIndex}\n${body}`;
  });
  return `Prompts:\n\n${lines.join("\n\n---\n\n")}`;
}

async function enrichChunk(
  config: LlmConfig,
  chunk: PromptCandidate[],
): Promise<PromptEnrichment[]> {
  const fallback = chunk.map((candidate) => heuristicEnrichment(candidate.body));

  try {
    const result = await callInference(config, buildEnrichUserPrompt(chunk), {
      responseFormat: "json_object",
      systemPrompt: ENRICH_SYSTEM_PROMPT,
    });

    const content = result.content.trim();
    // The model may wrap the array in an object or code fence; extract the array.
    const jsonText = extractJsonArray(content);
    const parsed = enrichmentArraySchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) {
      logger.debug("llm", "Prompt enrichment validation failed; using heuristics", {
        issues: parsed.error.issues.slice(0, 3),
      });
      return fallback;
    }

    const merged = [...fallback];
    for (const item of parsed.data) {
      if (item.index < 0 || item.index >= chunk.length) continue;
      const heuristic = fallback[item.index];
      merged[item.index] = {
        title: item.title || heuristic.title,
        summary: item.summary ?? heuristic.summary,
        tags: item.tags && item.tags.length > 0 ? item.tags : heuristic.tags,
        category: item.category ?? heuristic.category,
        score: typeof item.score === "number" ? item.score : heuristic.score,
      };
    }
    return merged;
  } catch (error) {
    logger.debug("llm", "Prompt enrichment chunk failed; using heuristics", {
      error: (error as Error)?.message ?? String(error),
    });
    return fallback;
  }
}

/** Extract a JSON array substring from a possibly-wrapped model response. */
function extractJsonArray(content: string): string {
  const fenced = content.replace(/```json|```/gi, "").trim();
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return fenced.slice(start, end + 1);
  }
  return fenced;
}

/**
 * Enrich candidates with LLM metadata. Returns one enrichment per input
 * candidate (aligned by index); candidates beyond `MAX_LLM_CANDIDATES` and any
 * failures use heuristic metadata.
 */
export async function enrichPromptCandidates(
  candidates: PromptCandidate[],
  config: LlmConfig,
): Promise<PromptEnrichment[]> {
  const result: PromptEnrichment[] = candidates.map((candidate) =>
    heuristicEnrichment(candidate.body),
  );

  const llmCount = Math.min(candidates.length, MAX_LLM_CANDIDATES);
  for (let offset = 0; offset < llmCount; offset += LLM_CHUNK_SIZE) {
    const chunk = candidates.slice(offset, Math.min(llmCount, offset + LLM_CHUNK_SIZE));
    const enriched = await enrichChunk(config, chunk);
    for (let i = 0; i < enriched.length; i += 1) {
      result[offset + i] = enriched[i];
    }
  }

  return result;
}

const COMPLETE_SYSTEM_PROMPT = `You are a prompt-engineering assistant. The user gives you a DRAFT prompt they intend to send to an AI assistant.
Rewrite it into a clearer, more effective prompt: add helpful role framing, explicit task, relevant constraints and a desired output format when useful. Preserve the user's intent and language. Keep any {{variables}} intact.
Return ONLY the improved prompt text, with no preamble, explanation, or surrounding quotes. Do NOT answer the prompt.`;

/**
 * Improve / complete a draft prompt. Returns the rewritten prompt, or the
 * original draft when no LLM is configured.
 */
export async function completePromptDraft(
  config: LlmConfig | null,
  payload: { draft: string; platform?: Platform; relatedPrompts?: Prompt[] },
): Promise<PromptCompletionResult> {
  const draft = payload.draft.trim();
  if (!draft) return { completion: "", usedLlm: false };
  if (!config) return { completion: draft, usedLlm: false };

  const references = (payload.relatedPrompts ?? [])
    .slice(0, 3)
    .map((prompt, index) => `Reference ${index + 1} (${prompt.title}):\n${prompt.body.slice(0, 400)}`)
    .join("\n\n");

  const userPrompt = [
    payload.platform ? `Target platform: ${payload.platform}` : null,
    references ? `Style references from the user's library:\n${references}` : null,
    `Draft prompt to improve:\n${draft}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await callInference(config, userPrompt, {
      systemPrompt: COMPLETE_SYSTEM_PROMPT,
    });
    const completion = result.content.trim();
    if (!completion) return { completion: draft, usedLlm: false };
    return { completion, usedLlm: true };
  } catch (error) {
    logger.debug("llm", "Prompt completion failed; returning draft", {
      error: (error as Error)?.message ?? String(error),
    });
    return { completion: draft, usedLlm: false };
  }
}
