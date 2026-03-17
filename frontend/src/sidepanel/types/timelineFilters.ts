import type { Platform } from "~lib/types";

export type HeaderMode = "default" | "search" | "filter";
export type DatePreset = "all_time" | "today" | "this_week" | "this_month";

export const DATE_PRESET_OPTIONS: ReadonlyArray<{
  id: DatePreset;
  label: string;
}> = [
  { id: "all_time", label: "Started any time" },
  { id: "today", label: "Started today" },
  { id: "this_week", label: "Started this week" },
  { id: "this_month", label: "Started this month" },
];

export const PLATFORM_OPTIONS: ReadonlyArray<Platform> = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "DeepSeek",
  "Qwen",
  "Doubao",
  "Kimi",
  "Yuanbao",
];
