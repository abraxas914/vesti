import { getLlmLanguageName, type SupportedLocale } from "../i18n/locales";
import type { PromptVersion, WeeklyRecapPromptPayload } from "./types";

// ──────────────────────────────────────────────────────────────────────────
// weekly_recap.v1 — "Plan B" warm recap writer.
// Stats are computed in code; this prompt only writes SHORT, encouraging copy
// (Spotify Wrapped / Duolingo tone). One LLM call, JSON-only output.
// ──────────────────────────────────────────────────────────────────────────

const WEEKLY_RECAP_SYSTEM = `You are Vesti's Weekly Recap writer — warm, upbeat, and personal, in the spirit of Spotify Wrapped or Duolingo's weekly summary.

Your job: turn the provided pre-computed stats into a SHORT, emotionally-encouraging recap as weekly_recap.v1 JSON.

Hard constraints:
1) Output ONE JSON object only. No markdown, no code fences, no commentary.
2) Each user-facing text field is ONE short sentence. Be specific and warm.
3) Write in the second person ("you"), celebrating the user's week.
4) Use the REAL numbers from the provided stats (conversation_count, active_days, streak_weeks, top_platform). Do NOT invent any facts beyond the provided stats and highlight.
5) If a highlight is provided, reflect it honestly in highlight.title/detail; if none is provided, set highlight to null.
6) mood_emoji is a single emoji that matches the week's energy.
7) persona_tag is a short, playful label for the user this week (<= 24 chars), e.g. "Deep Diver", "Curious Builder".
8) JSON field names stay in English. Only the text VALUES are localized.

Output schema (weekly_recap.v1):
{
  "schema": "weekly_recap.v1",
  "greeting": "string",
  "persona_tag": "string",
  "stats": {
    "conversation_count": 0,
    "active_days": 0,
    "streak_weeks": 0,
    "top_platform": "string",
    "week_over_week_delta": 0
  },
  "highlight": { "title": "string", "detail": "string" } | null,
  "encouragement": "string",
  "next_nudge": "string",
  "mood_emoji": "string"
}`;

const WEEKLY_RECAP_FALLBACK_SYSTEM =
  "You are a warm, encouraging weekly-recap writer. Output plain text only (3 short lines). Write in the language requested by the user prompt.";

function formatDate(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function buildStatsBlock(payload: WeeklyRecapPromptPayload): string {
  const { stats } = payload;
  const compact = {
    conversation_count: stats.conversationCount,
    active_days: stats.activeDays,
    streak_weeks: stats.streakWeeks,
    starred_count: stats.starredCount,
    week_over_week_delta: stats.weekOverWeekDelta,
    top_platforms: stats.topPlatforms,
    busiest_day: stats.busiestDay,
    top_topics: stats.topTopics,
  };
  return JSON.stringify(compact, null, 2);
}

function buildHighlightBlock(payload: WeeklyRecapPromptPayload): string {
  if (!payload.highlightContext) {
    return "null";
  }
  const { highlightContext } = payload;
  return JSON.stringify(
    {
      title: highlightContext.title,
      topic: highlightContext.topic,
      message_count: highlightContext.messageCount,
      turn_count: highlightContext.turnCount,
      is_starred: highlightContext.isStarred,
      summary_gist: highlightContext.summaryGist ?? null,
    },
    null,
    2
  );
}

function resolveTopPlatform(payload: WeeklyRecapPromptPayload): string {
  return payload.stats.topPlatforms[0]?.platform ?? "—";
}

function buildWeeklyRecapPrompt(payload: WeeklyRecapPromptPayload): string {
  const locale = payload.locale;
  const languageDirective = `Write all user-facing text VALUES in ${getLlmLanguageName(
    locale
  )}. Keep all JSON field names in English.`;

  return `Write a warm weekly_recap.v1 recap from the pre-computed stats below.

Time range: ${formatDate(payload.rangeStart)} ~ ${formatDate(payload.rangeEnd)}
Locale: ${locale}
Top platform (use verbatim in stats.top_platform): ${resolveTopPlatform(payload)}

Pre-computed stats (the ONLY facts you may use):
${buildStatsBlock(payload)}

Heaviest conversation this week (the "you chatted a lot" highlight; null if none):
${buildHighlightBlock(payload)}

Requirements:
1) Output one JSON object only, matching weekly_recap.v1.
2) Copy the numbers into stats exactly (conversation_count, active_days, streak_weeks, top_platform, week_over_week_delta).
3) Each text field is ONE short, warm, second-person sentence.
4) If the highlight above is null, set "highlight" to null; otherwise fill title + detail from it (no fabrication).
5) Pick a fitting mood_emoji and a playful persona_tag.
6) ${languageDirective}`;
}

function buildWeeklyRecapFallbackPrompt(
  payload: WeeklyRecapPromptPayload
): string {
  const locale = payload.locale;
  const languageDirective = `Write the recap in ${getLlmLanguageName(locale)}.`;

  return `Write a warm 3-line weekly recap (plain text, no JSON, no markdown).

This week: ${payload.stats.conversationCount} conversations across ${payload.stats.activeDays} active days, on a ${payload.stats.streakWeeks}-week streak. Top platform: ${resolveTopPlatform(payload)}.
${payload.highlightContext ? `Heaviest thread: ${payload.highlightContext.title}.` : ""}

Requirements:
1) Line 1: a warm greeting celebrating the week using the real numbers.
2) Line 2: one specific highlight (or general encouragement if none).
3) Line 3: a gentle nudge for next week.
4) ${languageDirective}`;
}

export const CURRENT_WEEKLY_RECAP_PROMPT: PromptVersion<WeeklyRecapPromptPayload> = {
  version: "v1.0.0",
  createdAt: "2026-06-16",
  description:
    "Weekly recap (Plan B): code-computed stats + one warm LLM copy pass producing weekly_recap.v1 JSON.",
  system: WEEKLY_RECAP_SYSTEM,
  fallbackSystem: WEEKLY_RECAP_FALLBACK_SYSTEM,
  userTemplate: buildWeeklyRecapPrompt,
  fallbackTemplate: buildWeeklyRecapFallbackPrompt,
};
