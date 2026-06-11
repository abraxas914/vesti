import type { Platform } from "~lib/types";

export type HeaderMode = "default" | "search" | "filter";
export type DatePreset = "all_time" | "today" | "this_week" | "this_month";

export interface DatePresetLabels {
  allTime: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
}

export function getDatePresetOptions(labels: DatePresetLabels): ReadonlyArray<{
  id: DatePreset;
  label: string;
}> {
  return [
    { id: "all_time", label: labels.allTime },
    { id: "today", label: labels.today },
    { id: "this_week", label: labels.thisWeek },
    { id: "this_month", label: labels.thisMonth },
  ];
}

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
