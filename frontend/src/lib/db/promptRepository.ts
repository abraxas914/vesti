// Persistence + orchestration for the Prompt Management store.
// Kept separate from the (large) repository.ts for isolation. Runs in the
// offscreen worker; reaches the LLM only through an injected `enrich` callback
// so this module stays usable with no model configured.

import { normalizePlatform } from "../platform";
import {
  canonicalizeForHash,
  computePromptHash,
  detectVariables,
  deriveTitle,
  extractCandidatesFromMessages,
  heuristicEnrichment,
  normalizeWhitespace,
  scorePrompt,
} from "../promptlib";
import type { PromptCandidate, PromptEnrichment } from "../promptlib";
import type {
  CreatePromptInput,
  Platform,
  Prompt,
  PromptExtractionResult,
  PromptListFilter,
  UpdatePromptChanges,
} from "../types";
import { logger } from "../utils/logger";
import { db } from "./schema";
import type { ConversationRecord, MessageRecord, PromptRecord } from "./schema";

function toPrompt(record: PromptRecord & { id: number }): Prompt {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    category: record.category,
    tags: Array.isArray(record.tags) ? record.tags : [],
    source: record.source,
    source_platform: record.source_platform,
    source_conversation_id: record.source_conversation_id,
    source_message_id: record.source_message_id,
    is_favorite: Boolean(record.is_favorite),
    is_archived: Boolean(record.is_archived),
    quality_score: typeof record.quality_score === "number" ? record.quality_score : 0,
    summary: record.summary ?? null,
    variables: Array.isArray(record.variables) ? record.variables : [],
    use_count: typeof record.use_count === "number" ? record.use_count : 0,
    last_used_at: record.last_used_at ?? null,
    body_hash: record.body_hash,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

async function getPromptById(id: number): Promise<Prompt | null> {
  const record = await db.prompts.get(id);
  if (!record || record.id === undefined) return null;
  return toPrompt(record as PromptRecord & { id: number });
}

function normalizePlatformValue(value: unknown): Platform | null {
  return normalizePlatform(value) ?? null;
}

export async function listPrompts(filter: PromptListFilter = {}): Promise<Prompt[]> {
  const records = await db.prompts.toArray();
  let prompts = records
    .filter((record): record is PromptRecord & { id: number } => record.id !== undefined)
    .map(toPrompt);

  if (!filter.includeArchived) {
    prompts = prompts.filter((prompt) => !prompt.is_archived);
  }
  if (filter.favoritesOnly) {
    prompts = prompts.filter((prompt) => prompt.is_favorite);
  }
  if (filter.source) {
    prompts = prompts.filter((prompt) => prompt.source === filter.source);
  }
  if (filter.category !== undefined) {
    prompts = prompts.filter((prompt) => prompt.category === filter.category);
  }
  if (filter.search?.trim()) {
    const needle = filter.search.trim().toLowerCase();
    prompts = prompts.filter(
      (prompt) =>
        prompt.title.toLowerCase().includes(needle) ||
        prompt.body.toLowerCase().includes(needle) ||
        prompt.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }

  const sort = filter.sort ?? "recent";
  prompts.sort((a, b) => {
    if (sort === "score") return b.quality_score - a.quality_score || b.updated_at - a.updated_at;
    if (sort === "usage") return b.use_count - a.use_count || b.updated_at - a.updated_at;
    return b.updated_at - a.updated_at;
  });

  return prompts;
}

export async function searchPrompts(query: string, limit = 8): Promise<Prompt[]> {
  const all = await listPrompts({ search: query, sort: "usage" });
  return all.slice(0, Math.max(1, limit));
}

/**
 * Create a prompt. De-duplicates by canonical body hash: if a prompt with the
 * same body already exists it is returned untouched (no duplicate row).
 */
export async function createPrompt(
  input: CreatePromptInput,
): Promise<{ prompt: Prompt; created: boolean }> {
  const body = normalizeWhitespace(input.body ?? "");
  if (!body) {
    throw new Error("PROMPT_BODY_REQUIRED");
  }

  const bodyHash = await computePromptHash(body);
  const existing = await db.prompts.where("body_hash").equals(bodyHash).first();
  if (existing && existing.id !== undefined) {
    return { prompt: toPrompt(existing as PromptRecord & { id: number }), created: false };
  }

  const now = Date.now();
  const heuristic = heuristicEnrichment(body);
  const record: PromptRecord = {
    title: input.title?.trim() || heuristic.title || deriveTitle(body),
    body,
    category: input.category ?? heuristic.category,
    tags: input.tags ?? heuristic.tags,
    source: input.source ?? "manual",
    source_platform: normalizePlatformValue(input.source_platform),
    source_conversation_id: input.source_conversation_id ?? null,
    source_message_id: input.source_message_id ?? null,
    is_favorite: input.is_favorite ?? false,
    is_archived: false,
    quality_score:
      typeof input.quality_score === "number" ? input.quality_score : heuristic.score,
    summary: input.summary ?? heuristic.summary,
    variables: detectVariables(body),
    use_count: 0,
    last_used_at: null,
    body_hash: bodyHash,
    created_at: now,
    updated_at: now,
  };

  const id = await db.prompts.add(record);
  const saved = await getPromptById(id as number);
  if (!saved) throw new Error("PROMPT_CREATE_FAILED");
  return { prompt: saved, created: true };
}

export async function updatePrompt(
  id: number,
  changes: UpdatePromptChanges,
): Promise<Prompt> {
  const existing = await db.prompts.get(id);
  if (!existing || existing.id === undefined) {
    throw new Error("PROMPT_NOT_FOUND");
  }

  const patch: Partial<PromptRecord> = { updated_at: Date.now() };

  if (changes.body !== undefined) {
    const body = normalizeWhitespace(changes.body);
    if (!body) throw new Error("PROMPT_BODY_REQUIRED");
    patch.body = body;
    patch.body_hash = await computePromptHash(body);
    patch.variables = detectVariables(body);
    // Keep score fresh when the body changes and no explicit score is given.
    if (changes.quality_score === undefined) patch.quality_score = scorePrompt(body);
  }
  if (changes.title !== undefined) patch.title = changes.title.trim() || existing.title;
  if (changes.category !== undefined) patch.category = changes.category;
  if (changes.tags !== undefined) patch.tags = changes.tags;
  if (changes.is_favorite !== undefined) patch.is_favorite = changes.is_favorite;
  if (changes.is_archived !== undefined) patch.is_archived = changes.is_archived;
  if (changes.summary !== undefined) patch.summary = changes.summary;
  if (changes.quality_score !== undefined) patch.quality_score = changes.quality_score;

  await db.prompts.update(id, patch);
  const updated = await getPromptById(id);
  if (!updated) throw new Error("PROMPT_NOT_FOUND");
  return updated;
}

export async function deletePrompt(id: number): Promise<boolean> {
  const existing = await db.prompts.get(id);
  if (!existing) return false;
  await db.prompts.delete(id);
  return true;
}

export async function togglePromptFavorite(id: number, isFavorite: boolean): Promise<Prompt> {
  return updatePrompt(id, { is_favorite: isFavorite });
}

export async function incrementPromptUsage(id: number): Promise<Prompt> {
  const existing = await db.prompts.get(id);
  if (!existing || existing.id === undefined) {
    throw new Error("PROMPT_NOT_FOUND");
  }
  await db.prompts.update(id, {
    use_count: (existing.use_count ?? 0) + 1,
    last_used_at: Date.now(),
  });
  const updated = await getPromptById(id);
  if (!updated) throw new Error("PROMPT_NOT_FOUND");
  return updated;
}

/** Optional LLM enricher injected by the offscreen route (P3). */
export type PromptBatchEnricher = (
  candidates: PromptCandidate[],
) => Promise<PromptEnrichment[]>;

export interface ExtractPromptsOptions {
  scope?: "all" | "recent";
  limit?: number;
}

/**
 * Scan captured conversations, extract prompt-worthy user turns, and archive
 * the new ones. De-dupes against the existing library by body hash. When an
 * `enrich` callback is supplied (LLM available) candidate metadata is refined;
 * otherwise heuristic metadata from the extractor is used.
 */
export async function extractPromptsFromLibrary(
  options: ExtractPromptsOptions = {},
  enrich?: PromptBatchEnricher,
): Promise<PromptExtractionResult> {
  const scope = options.scope ?? "recent";
  const conversationLimit = options.limit ?? (scope === "all" ? 500 : 50);

  const conversations = await db.conversations
    .orderBy("updated_at")
    .reverse()
    .limit(conversationLimit)
    .toArray();

  const allCandidates: PromptCandidate[] = [];
  const seenHashes = new Set<string>();

  for (const conversation of conversations) {
    const conversationId = conversation.id ?? null;
    if (conversationId === null) continue;

    const messages = (await db.messages
      .where("conversation_id")
      .equals(conversationId)
      .toArray()) as MessageRecord[];

    const candidates = extractCandidatesFromMessages(
      messages.map((message) => ({
        id: message.id ?? null,
        role: message.role,
        content_text: message.content_text ?? "",
      })),
      {
        conversationId,
        platform: normalizePlatformValue((conversation as ConversationRecord).platform),
      },
    );

    for (const candidate of candidates) {
      const hash = canonicalizeForHash(candidate.body);
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);
      allCandidates.push(candidate);
    }
  }

  let usedLlm = false;
  let enrichments: PromptEnrichment[] | null = null;
  if (enrich && allCandidates.length > 0) {
    try {
      enrichments = await enrich(allCandidates);
      usedLlm = true;
    } catch (error) {
      logger.debug("service", "Prompt enrichment failed; using heuristics", {
        error: (error as Error)?.message ?? String(error),
      });
      enrichments = null;
    }
  }

  let created = 0;
  let skipped = 0;

  for (let index = 0; index < allCandidates.length; index += 1) {
    const candidate = allCandidates[index];
    const enrichment = enrichments?.[index] ?? null;

    const result = await createPrompt({
      title: enrichment?.title ?? candidate.title,
      body: candidate.body,
      category: enrichment?.category ?? candidate.category,
      tags: enrichment?.tags ?? candidate.tags,
      source: "extracted",
      source_platform: candidate.platform,
      source_conversation_id: candidate.conversationId,
      source_message_id: candidate.messageId,
      summary: enrichment?.summary ?? null,
      quality_score: enrichment?.score ?? candidate.heuristicScore,
    });

    if (result.created) created += 1;
    else skipped += 1;
  }

  logger.info("service", "Prompt extraction complete", {
    scope,
    candidates: allCandidates.length,
    created,
    skipped,
    usedLlm,
  });

  return { created, skipped, candidates: allCandidates.length, usedLlm };
}
