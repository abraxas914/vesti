/**
 * Enhanced LLM Diagnostics for ModelScope Route Debugging
 * 
 * This module provides runtime diagnostics and troubleshooting tools
 * specifically designed for debugging ModelScope routing issues.
 */

import type { LlmConfig, LlmDiagnostic } from "../types";
import { logger } from "../utils/logger";
import { getEffectiveModelId, getLlmAccessMode, MODELSCOPE_BASE_URL } from "./llmConfig";
import { getLlmModelProfile } from "./llmModelProfile";
import { LlmRequestError } from "./llmService";

// ============================================================
// Diagnostic Event Types
// ============================================================

export type DiagnosticEventType =
  | "ROUTE_SELECTED"
  | "REQUEST_PREPARED"
  | "REQUEST_SENT"
  | "RESPONSE_RECEIVED"
  | "RESPONSE_PARSED"
  | "ERROR_OCCURRED"
  | "FALLBACK_TRIGGERED"
  | "RETRY_ATTEMPTED"
  | "JSON_RECOVERED"
  | "STREAM_EVENT";

export interface DiagnosticEvent {
  type: DiagnosticEventType;
  timestamp: number;
  route: "modelscope" | "proxy";
  requestId: string;
  payload: unknown;
}

// ============================================================
// Request/Response Tracer
// ============================================================

export class ModelScopeTracer {
  private events: DiagnosticEvent[] = [];
  private requestCounter = 0;

  private generateRequestId(): string {
    return `req-${++this.requestCounter}-${Date.now().toString(36)}`;
  }

  traceRouteSelection(config: LlmConfig): string {
    const requestId = this.generateRequestId();
    const route = getLlmAccessMode(config) === "demo_proxy" ? "proxy" : "modelscope";
    const modelId = getEffectiveModelId(config);
    const profile = getLlmModelProfile(modelId);

    const event: DiagnosticEvent = {
      type: "ROUTE_SELECTED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: {
        mode: config.mode,
        modelId,
        modelFamily: profile.modelFamily,
        responseFormatStrategy: profile.responseFormatStrategy,
        streamProfile: profile.streamProfile,
      },
    };

    this.events.push(event);

    logger.info("llm-trace", `[${requestId}] Route selected`, {
      route,
      modelId,
      modelFamily: profile.modelFamily,
    });

    return requestId;
  }

  traceRequestPrepared(
    requestId: string,
    route: "modelscope" | "proxy",
    details: {
      url: string;
      method: string;
      headers: Record<string, string>;
      payload: unknown;
    }
  ): void {
    const event: DiagnosticEvent = {
      type: "REQUEST_PREPARED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: {
        url: details.url,
        method: details.method,
        headerNames: Object.keys(details.headers),
        payloadKeys: Object.keys(details.payload as object),
        payloadSize: JSON.stringify(details.payload).length,
      },
    };

    this.events.push(event);

    logger.info("llm-trace", `[${requestId}] Request prepared`, {
      url: details.url,
      method: details.method,
      payloadSize: event.payload.payloadSize,
    });
  }

  traceRequestSent(
    requestId: string,
    route: "modelscope" | "proxy",
    startTime: number
  ): void {
    const event: DiagnosticEvent = {
      type: "REQUEST_SENT",
      timestamp: startTime,
      route,
      requestId,
      payload: { startTime },
    };

    this.events.push(event);
  }

  traceResponseReceived(
    requestId: string,
    route: "modelscope" | "proxy",
    details: {
      status: number;
      statusText: string;
      headers: Headers;
      latencyMs: number;
    }
  ): void {
    const headers: Record<string, string> = {};
    details.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const event: DiagnosticEvent = {
      type: "RESPONSE_RECEIVED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: {
        status: details.status,
        statusText: details.statusText,
        headers,
        latencyMs: details.latencyMs,
      },
    };

    this.events.push(event);

    const logLevel = details.status >= 400 ? "error" : "info";
    logger[logLevel]("llm-trace", `[${requestId}] Response received`, {
      status: details.status,
      latencyMs: details.latencyMs,
    });
  }

  traceResponseParsed(
    requestId: string,
    route: "modelscope" | "proxy",
    details: {
      hasContent: boolean;
      hasReasoningContent: boolean;
      contentLength: number;
      mode: string;
      finishReason?: string | null;
    }
  ): void {
    const event: DiagnosticEvent = {
      type: "RESPONSE_PARSED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: details,
    };

    this.events.push(event);

    logger.info("llm-trace", `[${requestId}] Response parsed`, {
      hasContent: details.hasContent,
      hasReasoningContent: details.hasReasoningContent,
      contentLength: details.contentLength,
      mode: details.mode,
    });
  }

  traceError(
    requestId: string,
    route: "modelscope" | "proxy",
    error: Error | LlmRequestError | unknown
  ): void {
    const isLlmError = error instanceof LlmRequestError;
    const diagnostic = isLlmError ? (error as LlmRequestError).diagnostic : null;

    const event: DiagnosticEvent = {
      type: "ERROR_OCCURRED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: {
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        isLlmError,
        diagnostic: diagnostic
          ? {
              code: diagnostic.code,
              status: diagnostic.status,
              route: diagnostic.route,
              userMessage: diagnostic.userMessage,
            }
          : null,
      },
    };

    this.events.push(event);

    logger.error("llm-trace", `[${requestId}] Error occurred`, {
      errorType: event.payload.errorType,
      diagnosticCode: diagnostic?.code,
      userMessage: diagnostic?.userMessage,
    });
  }

  traceFallback(
    requestId: string,
    route: "modelscope" | "proxy",
    details: {
      from: string;
      to: string;
      reason: string;
    }
  ): void {
    const event: DiagnosticEvent = {
      type: "FALLBACK_TRIGGERED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: details,
    };

    this.events.push(event);

    logger.warn("llm-trace", `[${requestId}] Fallback triggered`, {
      from: details.from,
      to: details.to,
      reason: details.reason,
    });
  }

  traceJsonRecovered(
    requestId: string,
    route: "modelscope" | "proxy",
    details: {
      from: "reasoning_content";
      originalContent: string;
      recoveredJson: string;
    }
  ): void {
    const event: DiagnosticEvent = {
      type: "JSON_RECOVERED",
      timestamp: Date.now(),
      route,
      requestId,
      payload: details,
    };

    this.events.push(event);

    logger.info("llm-trace", `[${requestId}] JSON recovered from reasoning_content`, {
      originalContentPreview: details.originalContent.slice(0, 100),
      recoveredJsonPreview: details.recoveredJson.slice(0, 100),
    });
  }

  getEvents(): DiagnosticEvent[] {
    return [...this.events];
  }

  getEventsForRequest(requestId: string): DiagnosticEvent[] {
    return this.events.filter(e => e.requestId === requestId);
  }

  getLastEvent(): DiagnosticEvent | null {
    return this.events[this.events.length - 1] || null;
  }

  clear(): void {
    this.events = [];
    this.requestCounter = 0;
  }

  generateTimeline(): string {
    const lines: string[] = [];
    lines.push("=".repeat(80));
    lines.push("MODELSCOPE ROUTE DIAGNOSTIC TIMELINE");
    lines.push("=".repeat(80));
    lines.push("");

    const groupedByRequest = this.groupByRequest();

    for (const [requestId, events] of Object.entries(groupedByRequest)) {
      lines.push(`\n📦 Request: ${requestId}`);
      lines.push("-".repeat(40));

      for (const event of events) {
        const time = new Date(event.timestamp).toISOString().split("T")[1].slice(0, -1);
        const icon = this.getEventIcon(event.type);
        lines.push(`  [${time}] ${icon} ${event.type}`);

        // Add relevant details
        switch (event.type) {
          case "ROUTE_SELECTED":
            lines.push(`      Route: ${event.payload.route}`);
            lines.push(`      Model: ${event.payload.modelId}`);
            lines.push(`      Family: ${event.payload.modelFamily}`);
            break;
          case "RESPONSE_RECEIVED":
            lines.push(`      Status: ${event.payload.status}`);
            lines.push(`      Latency: ${event.payload.latencyMs}ms`);
            break;
          case "ERROR_OCCURRED":
            lines.push(`      Type: ${event.payload.errorType}`);
            lines.push(`      Message: ${event.payload.errorMessage}`);
            if (event.payload.diagnostic) {
              lines.push(`      Code: ${event.payload.diagnostic.code}`);
            }
            break;
          case "FALLBACK_TRIGGERED":
            lines.push(`      ${event.payload.from} → ${event.payload.to}`);
            lines.push(`      Reason: ${event.payload.reason}`);
            break;
        }
      }
    }

    lines.push("");
    lines.push("=".repeat(80));
    return lines.join("\n");
  }

  private groupByRequest(): Record<string, DiagnosticEvent[]> {
    return this.events.reduce((acc, event) => {
      acc[event.requestId] = acc[event.requestId] || [];
      acc[event.requestId].push(event);
      return acc;
    }, {} as Record<string, DiagnosticEvent[]>);
  }

  private getEventIcon(type: DiagnosticEventType): string {
    const icons: Record<DiagnosticEventType, string> = {
      ROUTE_SELECTED: "🛤️",
      REQUEST_PREPARED: "📋",
      REQUEST_SENT: "📤",
      RESPONSE_RECEIVED: "📥",
      RESPONSE_PARSED: "🔍",
      ERROR_OCCURRED: "❌",
      FALLBACK_TRIGGERED: "🔄",
      RETRY_ATTEMPTED: "🔄",
      JSON_RECOVERED: "💎",
      STREAM_EVENT: "🌊",
    };
    return icons[type] || "📍";
  }
}

// ============================================================
// Common Issue Detector
// ============================================================

export interface DetectedIssue {
  severity: "error" | "warning" | "info";
  code: string;
  title: string;
  description: string;
  suggestions: string[];
  relatedEvents?: string[];
}

export class IssueDetector {
  private tracer: ModelScopeTracer;

  constructor(tracer: ModelScopeTracer) {
    this.tracer = tracer;
  }

  detectIssues(): DetectedIssue[] {
    const issues: DetectedIssue[] = [];
    const events = this.tracer.getEvents();

    // Check for authentication errors
    const authErrors = events.filter(
      e => e.type === "ERROR_OCCURRED" && 
      (e.payload as { diagnostic?: { code: string } }).diagnostic?.code?.includes("auth")
    );
    
    if (authErrors.length > 0) {
      issues.push({
        severity: "error",
        code: "AUTH_FAILURE_PATTERN",
        title: "Authentication Failures Detected",
        description: `Found ${authErrors.length} authentication error(s). This usually indicates an invalid or expired API key.`,
        suggestions: [
          "Verify your ModelScope API key is correct and not expired.",
          "Check if the API key has the necessary permissions.",
          "Generate a new API key from the ModelScope console.",
        ],
        relatedEvents: authErrors.map(e => e.requestId),
      });
    }

    // Check for frequent fallbacks
    const fallbacks = events.filter(e => e.type === "FALLBACK_TRIGGERED");
    if (fallbacks.length > 3) {
      issues.push({
        severity: "warning",
        code: "FREQUENT_FALLBACKS",
        title: "Frequent Fallbacks to Alternative JSON Methods",
        description: `${fallbacks.length} fallback(s) detected. This may indicate the primary JSON method is not working correctly.`,
        suggestions: [
          "Check if the model supports JSON mode (response_format: 'json_object').",
          "Consider updating the model profile to use 'prompt_json_first' strategy.",
          "Verify the model version supports structured outputs.",
        ],
        relatedEvents: fallbacks.map(e => e.requestId),
      });
    }

    // Check for high latency
    const responses = events.filter(e => e.type === "RESPONSE_RECEIVED");
    const highLatencyResponses = responses.filter(
      e => (e.payload as { latencyMs: number }).latencyMs > 30000
    );
    
    if (highLatencyResponses.length > 0) {
      issues.push({
        severity: "warning",
        code: "HIGH_LATENCY",
        title: "High Response Latency",
        description: `${highLatencyResponses.length} request(s) took longer than 30 seconds.`,
        suggestions: [
          "Check your network connection stability.",
          "Consider using a model with faster response times.",
          "ModelScope API may be experiencing high load.",
          "Consider implementing request timeouts.",
        ],
        relatedEvents: highLatencyResponses.map(e => e.requestId),
      });
    }

    // Check for JSON recovery patterns
    const jsonRecoveries = events.filter(e => e.type === "JSON_RECOVERED");
    if (jsonRecoveries.length > 0) {
      issues.push({
        severity: "info",
        code: "JSON_RECOVERY_USED",
        title: "JSON Recovery from Reasoning Content",
        description: `${jsonRecoveries.length} JSON recovery(ies) from reasoning_content. This indicates the model is outputting JSON in its thinking process.`,
        suggestions: [
          "This is normal for reasoning models like DeepSeek-R1.",
          "The recovery mechanism is working correctly.",
          "Consider adjusting prompts to encourage direct JSON output.",
        ],
        relatedEvents: jsonRecoveries.map(e => e.requestId),
      });
    }

    // Check for rate limiting
    const rateLimitErrors = events.filter(
      e => e.type === "ERROR_OCCURRED" && 
      (e.payload as { diagnostic?: { code: string } }).diagnostic?.code?.includes("rate")
    );
    
    if (rateLimitErrors.length > 0) {
      issues.push({
        severity: "warning",
        code: "RATE_LIMITING",
        title: "Rate Limiting Detected",
        description: "Your requests are being rate limited by the API.",
        suggestions: [
          "Reduce request frequency.",
          "Implement exponential backoff for retries.",
          "Consider upgrading your API plan for higher limits.",
        ],
        relatedEvents: rateLimitErrors.map(e => e.requestId),
      });
    }

    // Check for model not found errors
    const modelNotFoundErrors = events.filter(
      e => e.type === "ERROR_OCCURRED" && 
      (e.payload as { errorMessage?: string }).errorMessage?.toLowerCase().includes("model")
    );
    
    if (modelNotFoundErrors.length > 0) {
      issues.push({
        severity: "error",
        code: "MODEL_NOT_FOUND",
        title: "Model Not Found Errors",
        description: "The specified model ID may be incorrect or unavailable.",
        suggestions: [
          "Verify the model ID is correct.",
          "Check if the model is available in your region.",
          "Ensure you have access to the model tier.",
        ],
        relatedEvents: modelNotFoundErrors.map(e => e.requestId),
      });
    }

    return issues;
  }

  generateReport(): string {
    const issues = this.detectIssues();
    
    if (issues.length === 0) {
      return "✅ No issues detected in the current trace.";
    }

    const lines: string[] = [];
    lines.push("🔍 ISSUE DETECTION REPORT");
    lines.push("=" .repeat(60));
    lines.push("");

    const errors = issues.filter(i => i.severity === "error");
    const warnings = issues.filter(i => i.severity === "warning");
    const infos = issues.filter(i => i.severity === "info");

    if (errors.length > 0) {
      lines.push(`❌ ERRORS (${errors.length})`);
      lines.push("-".repeat(40));
      errors.forEach(issue => this.formatIssue(lines, issue));
    }

    if (warnings.length > 0) {
      lines.push(`\n⚠️  WARNINGS (${warnings.length})`);
      lines.push("-".repeat(40));
      warnings.forEach(issue => this.formatIssue(lines, issue));
    }

    if (infos.length > 0) {
      lines.push(`\nℹ️  INFO (${infos.length})`);
      lines.push("-".repeat(40));
      infos.forEach(issue => this.formatIssue(lines, issue));
    }

    return lines.join("\n");
  }

  private formatIssue(lines: string[], issue: DetectedIssue): void {
    lines.push(`\n[${issue.code}] ${issue.title}`);
    lines.push(`  ${issue.description}`);
    lines.push("");
    lines.push("  Suggestions:");
    issue.suggestions.forEach(s => lines.push(`    • ${s}`));
  }
}

// ============================================================
// Convenience Export
// ============================================================

export const globalTracer = new ModelScopeTracer();
export const globalIssueDetector = new IssueDetector(globalTracer);

export function resetDiagnostics(): void {
  globalTracer.clear();
}

export function getDiagnosticReport(): string {
  const timeline = globalTracer.generateTimeline();
  const issues = globalIssueDetector.generateReport();
  
  return `${timeline}\n\n${issues}`;
}

export function logDiagnosticReport(): void {
  console.log(getDiagnosticReport());
}

// Export to window for console debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).vestiDiagnostics = {
    tracer: globalTracer,
    issueDetector: globalIssueDetector,
    reset: resetDiagnostics,
    getReport: getDiagnosticReport,
    logReport: logDiagnosticReport,
  };
  
  console.log("🔧 Vesti diagnostics loaded. Access via: window.vestiDiagnostics");
}
