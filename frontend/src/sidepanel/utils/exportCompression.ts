import { getPrompt } from "~lib/prompts";
import type { ExportCompressionPromptPayload } from "~lib/prompts";
import {
  FUTURE_MODELSCOPE_EXPORT_MODEL_CANDIDATES,
  FUTURE_MOONSHOT_DIRECT_EXPORT_MODEL_CANDIDATES,
  getEffectiveModelId,
} from "~lib/services/llmConfig";
import {
  getLlmModelProfile,
  type ExportPromptProfile,
} from "~lib/services/llmModelProfile";
import {
  callInference,
  getLlmDiagnostic,
  type LlmDiagnostic,
  sanitizeSummaryText,
  truncateForContext,
} from "~lib/services/llmService";
import { getLlmSettings } from "~lib/services/llmSettingsService";
import { getConversationOriginAt } from "~lib/conversations/timestamps";
import type { Conversation, Message } from "~lib/types";
import { logger } from "~lib/utils/logger";
import type {
  ConversationExportContentMode,
  ConversationExportNotice,
} from "../types/export";

export type ExportCompressionMode = Exclude<
  ConversationExportContentMode,
  "full"
>;
export type ExportCompressionRoute =
  | "current_llm_settings"
  | "moonshot_direct";
export type ExportCompressionSource = "llm" | "local_fallback";
export type ExportCompressionInvalidReasonCode =
  | "export_output_too_short"
  | "export_missing_required_headings"
  | "export_grounded_sections_insufficient"
  | "export_artifact_signal_missing";

export interface ConversationExportDatasetItem {
  conversation: Conversation;
  messages: Message[];
}

export interface CompressedConversationExport {
  conversation: Conversation;
  messages: Message[];
  body: string;
  mode: ExportCompressionMode;
  source: ExportCompressionSource;
  route?: ExportCompressionRoute;
  usedFallbackPrompt: boolean;
  fallbackReason?: string;
  diagnostic?: LlmDiagnostic;
  modelId?: string;
  exportPromptProfile?: ExportPromptProfile;
  primaryInvalidReason?: ExportCompressionInvalidReasonCode;
  fallbackInvalidReason?: ExportCompressionInvalidReasonCode;5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
): CompressedConversationExport {
  const body =
    mode === "compact"
      ? buildCompactFallback(item, reason)
      : buildSummaryFallback(item, reason);

  return {
    conversation: item.conversation,
    messages: item.messages,
    body,
    mode,
    source: "local_fallback",
    route: failureContext?.route,
    usedFallbackPrompt: false,
    fallbackReason: diagnostic?.code || reason,
    diagnostic: diagnostic || undefined,
    modelId: failureContext?.modelId,
    exportPromptProfile: failureContext?.exportPromptProfile,
    primaryInvalidReason: failureContext?.primaryInvalidReason,
    fallbackInvalidReason: failureContext?.fallbackInvalidReason,5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
      };
    case "export_grounded_sections_insufficient":
      return {
        detail:
          "LLM returned the right shape, but too many sections were generic or not grounded in the thread. Validation: export_grounded_sections_insufficient.",
        hint: "This usually means the model answered loosely instead of preserving the thread's actual moves and constraints.",
      };
    case "export_artifact_signal_missing":
      return {
        detail:
          "LLM returned structured text, but dropped code, command, or file-path evidence that the thread contained. Validation: export_artifact_signal_missing.",
        hint: "Use Full export for now if artifact fidelity is critical, then retry after we tune the compression profile.",
      };
    default:
      return null;
  }
}

function describeCompressionRoute(
  route: ExportCompressionRoute | undefined
): string {
  switch (route) {
    case "current_llm_settings":
      return "Current LLM settings";
    case "moonshot_direct":
      return "Moonshot direct";
    default:
      return "Unknown";
  }
}

function buildCompressionTechnicalSummary(
  result: CompressedConversationExport
): string | undefined {
  const parts: string[] = [];

  if (result.diagnostic?.technicalSummary) {
    parts.push(result.diagnostic.technicalSummary);
  }

  if (result.route) {
    parts.push(`Compression route: ${describeCompressionRoute(result.route)}`);
  }

  if (result.modelId) {
    parts.push(`Model: ${result.modelId}`);
  }

  if (result.exportPromptProfile) {
    parts.push(`Profile: ${result.exportPromptProfile}`);
  }

  if (result.primaryInvalidReason) {
    parts.push(`Primary: ${result.primaryInvalidReason}`);
  }

  if (result.fallbackInvalidReason) {
    parts.push(`Fallback: ${result.fallbackInvalidReason}`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}
5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
  const detail = diagnostic
    ? `${diagnostic.userMessage}
${diagnostic.technicalSummary}`
    : validationFeedback?.detail;
  const hint = diagnostic
    ? "Check Settings > Model Access."
    : validationFeedback?.hint;

  if (llmCount === 0) {
    return {
      tone: "warning",
      message: `${mode === "compact" ? "Compact" : "Summary"} export used structured local fallback for all selected threads.`,
      title: "Local fallback used for all selected threads",
      detail,
      technicalSummary,5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
    hint,
    diagnostic: diagnostic || null,
  };
}

export function isExportCompressionRouteEnabled(
  route: ExportCompressionRoute
): boolean {
  return ROUTE_STATUS[route].enabled;
}

export function resolveExportCompressionRoute(): ExportCompressionRoute {
  return ACTIVE_EXPORT_COMPRESSION_ROUTE;
}

export function getExportCompressionRouteInfo() {
  return {
    active: ACTIVE_EXPORT_COMPRESSION_ROUTE,
    status: ROUTE_STATUS,
    futureCandidates: {
      modelscope: [...FUTURE_MODELSCOPE_EXPORT_MODEL_CANDIDATES],
      moonshotDirect: [...FUTURE_MOONSHOT_DIRECT_EXPORT_MODEL_CANDIDATES],
    },
  };
}

export async function compressExportDataset(
  dataset: ConversationExportDatasetItem[],
  mode: ExportCompressionMode
): Promise<{
  items: CompressedConversationExport[];
  notice: ConversationExportNotice;
}> {
  const route = resolveExportCompressionRoute();
  const adapter = ADAPTERS[route];
  const items: CompressedConversationExport[] = [];

  for (const rawItem of dataset) {
    const item: ConversationExportDatasetItem = {
      conversation: rawItem.conversation,
      messages: toOrderedMessages(rawItem.messages),
    };

    if (!isExportCompressionRouteEnabled(route)) {
      items.push(buildLocalFallback(item, mode, `${route}_disabled`));
      continue;
    }

    try {
      items.push(await adapter.compress(item, mode));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "compression_failed";
      const diagnostic = getLlmDiagnostic(error);
      const failureContext =
        error instanceof ExportCompressionValidationError
          ? error.context
          : null;5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
    }
  }

  return {
    items,
    notice: buildCompressionNotice(items, mode),
  };
}

