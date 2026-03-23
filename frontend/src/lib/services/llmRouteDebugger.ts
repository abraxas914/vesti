/**
 * LLM Route Debugger for ModelScope
 * 
 * This module provides comprehensive diagnostic tools for debugging
 * ModelScope routing issues, including:
 * - Request/Response tracing
 * - Config validation
 * - Error simulation
 * - Performance profiling
 */

import type { LlmConfig, LlmDiagnostic } from "../types";
import { logger } from "../utils/logger";
import {
  getEffectiveModelId,
  getLlmAccessMode,
  getProxyRouteUrl,
  MODELSCOPE_BASE_URL,
} from "./llmConfig";
import { getLlmModelProfile } from "./llmModelProfile";

// ============================================================
// Types
// ============================================================

export interface RouteDebugContext {
  timestamp: number;
  route: "modelscope" | "proxy" | "unknown";
  config: LlmConfig;
  request?: RequestDebugInfo;
  response?: ResponseDebugInfo;
  error?: ErrorDebugInfo;
  performance?: PerformanceMetrics;
}

export interface RequestDebugInfo {
  url: string;
  method: string;
  headers: Record<string, string>;
  payload: unknown;
  payloadSize: number;
}

export interface ResponseDebugInfo {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  bodySize: number;
  latencyMs: number;
}

export interface ErrorDebugInfo {
  type: string;
  message: string;
  stack?: string;
  diagnostic?: LlmDiagnostic;
  isRetryable: boolean;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  totalMs: number;
  dnsLookupMs?: number;
  connectionMs?: number;
  ttfbMs?: number;
  downloadMs?: number;
}

export interface RouteTestResult {
  success: boolean;
  route: "modelscope" | "proxy";
  stage: "config" | "network" | "auth" | "request" | "response" | "parsing";
  message: string;
  details: Record<string, unknown>;
  suggestions: string[];
}

export interface ConfigValidationResult {
  isValid: boolean;
  mode: "demo_proxy" | "custom_byok" | "unknown";
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

export interface ConfigError {
  field: string;
  code: string;
  message: string;
}

export interface ConfigWarning {
  field: string;
  code: string;
  message: string;
  suggestion: string;
}

// ============================================================
// Config Validation
// ============================================================

export function validateLlmConfig(config: LlmConfig | null | undefined): ConfigValidationResult {
  const errors: ConfigError[] = [];
  const warnings: ConfigWarning[] = [];
  
  if (!config) {
    return {
      isValid: false,
      mode: "unknown",
      errors: [{ field: "config", code: "MISSING", message: "Config is null or undefined" }],
      warnings: [],
    };
  }

  const mode = getLlmAccessMode(config);
  const modelId = getEffectiveModelId(config);
  const modelProfile = getLlmModelProfile(modelId);

  // Mode-specific validation
  if (mode === "demo_proxy") {
    // Proxy mode validation
    const proxyBaseUrl = (config.proxyBaseUrl || config.proxyUrl || "").trim();
    
    if (!proxyBaseUrl) {
      errors.push({
        field: "proxyBaseUrl",
        code: "MISSING",
        message: "Proxy base URL is required for demo_proxy mode",
      });
    } else {
      try {
        const url = new URL(proxyBaseUrl);
        if (!url.protocol.startsWith("http")) {
          errors.push({
            field: "proxyBaseUrl",
            code: "INVALID_PROTOCOL",
            message: `Proxy URL must use HTTP or HTTPS protocol, got: ${url.protocol}`,
          });
        }
      } catch (e) {
        errors.push({
          field: "proxyBaseUrl",
          code: "INVALID_URL",
          message: `Proxy URL is not a valid URL: ${proxyBaseUrl}`,
        });
      }
    }

    if (!modelId) {
      errors.push({
        field: "modelId",
        code: "MISSING",
        message: "Model ID is required",
      });
    }

    // Warnings for proxy mode
    if (!config.proxyServiceToken?.trim()) {
      warnings.push({
        field: "proxyServiceToken",
        code: "MISSING",
        message: "No proxy service token configured",
        suggestion: "Some proxy servers require a service token for authentication. Check with your proxy provider.",
      });
    }
  } else if (mode === "custom_byok") {
    // BYOK mode validation
    const baseUrl = (config.baseUrl || "").trim();
    const apiKey = (config.apiKey || "").trim();

    if (!baseUrl) {
      errors.push({
        field: "baseUrl",
        code: "MISSING",
        message: "Base URL is required for custom_byok mode",
      });
    } else {
      try {
        const url = new URL(baseUrl);
        if (!url.protocol.startsWith("http")) {
          errors.push({
            field: "baseUrl",
            code: "INVALID_PROTOCOL",
            message: `Base URL must use HTTP or HTTPS protocol, got: ${url.protocol}`,
          });
        }
        if (!baseUrl.includes("modelscope")) {
          warnings.push({
            field: "baseUrl",
            code: "NON_STANDARD",
            message: `Base URL does not contain 'modelscope': ${baseUrl}`,
            suggestion: "Ensure this is the correct ModelScope inference endpoint.",
          });
        }
      } catch (e) {
        errors.push({
          field: "baseUrl",
          code: "INVALID_URL",
          message: `Base URL is not a valid URL: ${baseUrl}`,
        });
      }
    }

    if (!apiKey) {
      errors.push({
        field: "apiKey",
        code: "MISSING",
        message: "API key is required for custom_byok mode",
      });
    } else if (apiKey.length < 10) {
      warnings.push({
        field: "apiKey",
        code: "SUSPICIOUS_LENGTH",
        message: `API key seems too short (${apiKey.length} chars)`,
        suggestion: "Verify your API key is complete and correct.",
      });
    }

    if (!modelId) {
      errors.push({
        field: "modelId",
        code: "MISSING",
        message: "Model ID is required",
      });
    }
  }

  // Common validation
  if (modelId) {
    if (modelProfile.modelFamily === "unknown") {
      warnings.push({
        field: "modelId",
        code: "UNKNOWN_MODEL",
        message: `Model '${modelId}' is not in the known model list`,
        suggestion: "The model may still work, but optimal settings won't be applied.",
      });
    }
  }

  // Temperature validation
  if (typeof config.temperature === "number") {
    if (config.temperature < 0 || config.temperature > 2) {
      warnings.push({
        field: "temperature",
        code: "OUT_OF_RANGE",
        message: `Temperature ${config.temperature} is outside typical range (0-2)`,
        suggestion: "Recommended range is 0.1-0.7 for summarization tasks.",
      });
    }
  }

  // Max tokens validation
  if (typeof config.maxTokens === "number") {
    if (config.maxTokens < 100) {
      warnings.push({
        field: "maxTokens",
        code: "TOO_LOW",
        message: `maxTokens (${config.maxTokens}) may be too low for meaningful output`,
        suggestion: "Consider increasing to at least 400 for summaries.",
      });
    }
    if (config.maxTokens > 8000) {
      warnings.push({
        field: "maxTokens",
        code: "TOO_HIGH",
        message: `maxTokens (${config.maxTokens}) is very high`,
        suggestion: "This may increase costs and latency significantly.",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    mode: mode === "custom_byok" ? "custom_byok" : mode === "demo_proxy" ? "demo_proxy" : "unknown",
    errors,
    warnings,
  };
}

// ============================================================
// Route Testing
// ============================================================

export async function testModelScopeRoute(
  config: LlmConfig,
  options: {
    testModel?: string;
    timeoutMs?: number;
    verbose?: boolean;
  } = {}
): Promise<RouteTestResult> {
  const { testModel, timeoutMs = 30000, verbose = false } = options;
  const startTime = performance.now();
  
  logger.info("llm-debug", "Starting ModelScope route test", {
    model: testModel || getEffectiveModelId(config),
    timeout: timeoutMs,
  });

  // Stage 1: Config validation
  const validation = validateLlmConfig(config);
  if (!validation.isValid) {
    return {
      success: false,
      route: "modelscope",
      stage: "config",
      message: `Configuration invalid: ${validation.errors.map(e => e.message).join(", ")}`,
      details: { validation },
      suggestions: validation.errors.map(e => `Fix ${e.field}: ${e.message}`),
    };
  }

  if (validation.mode !== "custom_byok") {
    return {
      success: false,
      route: "modelscope",
      stage: "config",
      message: `Mode is '${validation.mode}', expected 'custom_byok' for ModelScope direct route`,
      details: { validation },
      suggestions: ["Switch to 'custom_byok' mode in settings to use ModelScope directly."],
    };
  }

  // Stage 2: Network connectivity
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const testUrl = `${baseUrl}/models`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const connectivityTest = await fetch(testUrl, {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (verbose) {
      logger.info("llm-debug", "Connectivity test result", {
        url: testUrl,
        status: connectivityTest.status,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      route: "modelscope",
      stage: "network",
      message: `Network connectivity test failed: ${errorMessage}`,
      details: { 
        url: testUrl,
        error: errorMessage,
        errorType: error instanceof Error ? error.name : typeof error,
      },
      suggestions: [
        "Check your internet connection.",
        "Verify the baseUrl is correct and accessible.",
        "If using a proxy/VPN, ensure it's configured correctly.",
        "Check if ModelScope API is experiencing outages.",
      ],
    };
  }

  // Stage 3: Authentication test
  const chatUrl = `${baseUrl}/chat/completions`;
  const testPayload = {
    model: testModel || getEffectiveModelId(config),
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 10,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const authTestStart = performance.now();
    const authTest = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });
    const authTestLatency = performance.now() - authTestStart;
    
    clearTimeout(timeoutId);

    if (authTest.status === 401) {
      const errorBody = await authTest.text();
      return {
        success: false,
        route: "modelscope",
        stage: "auth",
        message: "Authentication failed: Invalid API key",
        details: {
          status: authTest.status,
          response: errorBody,
          latencyMs: authTestLatency,
        },
        suggestions: [
          "Verify your ModelScope API key is correct.",
          "Check if the API key has expired.",
          "Ensure the API key has access to the requested model.",
          "Generate a new API key from ModelScope console if needed.",
        ],
      };
    }

    if (authTest.status === 404) {
      return {
        success: false,
        route: "modelscope",
        stage: "request",
        message: "Model or endpoint not found",
        details: {
          status: authTest.status,
          model: testPayload.model,
          url: chatUrl,
        },
        suggestions: [
          `Verify the model ID '${testPayload.model}' is correct.`,
          "Check if the model is available in your region.",
          "Ensure you have access to this model tier.",
        ],
      };
    }

    if (authTest.status === 429) {
      const retryAfter = authTest.headers.get("retry-after");
      return {
        success: false,
        route: "modelscope",
        stage: "request",
        message: "Rate limit exceeded",
        details: {
          status: authTest.status,
          retryAfter: retryAfter || "unknown",
        },
        suggestions: [
          "Wait a moment before trying again.",
          "Consider reducing request frequency.",
          `Retry after: ${retryAfter ? `${retryAfter}s` : "a few moments"}.`,
        ],
      };
    }

    if (!authTest.ok) {
      const errorBody = await authTest.text();
      return {
        success: false,
        route: "modelscope",
        stage: "request",
        message: `Request failed with status ${authTest.status}`,
        details: {
          status: authTest.status,
          statusText: authTest.statusText,
          response: errorBody,
          headers: Object.fromEntries(authTest.headers.entries()),
        },
        suggestions: [
          `Check ModelScope API documentation for status code ${authTest.status}.`,
          "Verify request payload format.",
          "Contact ModelScope support if the issue persists.",
        ],
      };
    }

    // Stage 4: Response parsing
    try {
      const responseBody = await authTest.json();
      const totalLatency = performance.now() - startTime;
      
      if (verbose) {
        logger.info("llm-debug", "Response parsing successful", {
          hasChoices: Array.isArray(responseBody.choices),
          choicesCount: responseBody.choices?.length,
          latencyMs: totalLatency,
        });
      }

      return {
        success: true,
        route: "modelscope",
        stage: "parsing",
        message: `ModelScope route test passed in ${Math.round(totalLatency)}ms`,
        details: {
          latencyMs: totalLatency,
          responseStructure: {
            hasChoices: Array.isArray(responseBody.choices),
            hasUsage: !!responseBody.usage,
            hasId: !!responseBody.id,
          },
          model: responseBody.model,
        },
        suggestions: [],
      };
    } catch (parseError) {
      const responseText = await authTest.text();
      return {
        success: false,
        route: "modelscope",
        stage: "parsing",
        message: "Failed to parse response as JSON",
        details: {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: responseText.slice(0, 500),
        },
        suggestions: [
          "The API may be returning non-JSON responses.",
          "Check if there are network intermediaries modifying responses.",
          "Verify the API endpoint is correct.",
        ],
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        route: "modelscope",
        stage: "request",
        message: `Request timed out after ${timeoutMs}ms`,
        details: { timeoutMs },
        suggestions: [
          "The request took too long to complete.",
          "Check your network connection.",
          "ModelScope API may be experiencing high load.",
          "Consider increasing the timeout for large requests.",
        ],
      };
    }

    return {
      success: false,
      route: "modelscope",
      stage: "request",
      message: `Request failed: ${errorMessage}`,
      details: { error: errorMessage },
      suggestions: [
        "Check your network connection.",
        "Verify firewall settings allow connections to ModelScope.",
        "Try again in a few moments.",
      ],
    };
  }
}

// ============================================================
// Debug Logging
// ============================================================

export function createRouteDebugger(route: "modelscope" | "proxy") {
  const contexts: RouteDebugContext[] = [];
  
  return {
    start(config: LlmConfig): RouteDebugContext {
      const context: RouteDebugContext = {
        timestamp: Date.now(),
        route,
        config: { ...config, apiKey: "***REDACTED***", proxyServiceToken: "***REDACTED***" },
      };
      contexts.push(context);
      logger.info("llm-debug", `[${route}] Request started`, { timestamp: context.timestamp });
      return context;
    },
    
    logRequest(context: RouteDebugContext, info: RequestDebugInfo) {
      context.request = info;
      logger.info("llm-debug", `[${route}] Request prepared`, {
        url: info.url,
        method: info.method,
        payloadSize: info.payloadSize,
        headers: Object.keys(info.headers),
      });
    },
    
    logResponse(context: RouteDebugContext, info: ResponseDebugInfo) {
      context.response = info;
      logger.info("llm-debug", `[${route}] Response received`, {
        status: info.status,
        latencyMs: info.latencyMs,
        bodySize: info.bodySize,
      });
    },
    
    logError(context: RouteDebugContext, info: ErrorDebugInfo) {
      context.error = info;
      logger.error("llm-debug", `[${route}] Error occurred`, {
        type: info.type,
        message: info.message,
        isRetryable: info.isRetryable,
      });
    },
    
    getContexts() {
      return [...contexts];
    },
    
    clear() {
      contexts.length = 0;
    },
    
    generateReport(): string {
      return generateDebugReport(contexts);
    },
  };
}

function generateDebugReport(contexts: RouteDebugContext[]): string {
  const lines: string[] = [];
  lines.push("# LLM Route Debug Report");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Requests: ${contexts.length}`);
  lines.push("");
  
  const byRoute = groupBy(contexts, c => c.route);
  
  for (const [route, routeContexts] of Object.entries(byRoute)) {
    lines.push(`## ${route.toUpperCase()} (${routeContexts.length} requests)`);
    lines.push("");
    
    for (const ctx of routeContexts) {
      lines.push(`### Request at ${new Date(ctx.timestamp).toISOString()}`);
      
      if (ctx.request) {
        lines.push("**Request:**");
        lines.push(`- URL: ${ctx.request.url}`);
        lines.push(`- Method: ${ctx.request.method}`);
        lines.push(`- Payload Size: ${ctx.request.payloadSize} bytes`);
        lines.push("");
      }
      
      if (ctx.response) {
        lines.push("**Response:**");
        lines.push(`- Status: ${ctx.response.status}`);
        lines.push(`- Latency: ${ctx.response.latencyMs}ms`);
        lines.push(`- Body Size: ${ctx.response.bodySize} bytes`);
        lines.push("");
      }
      
      if (ctx.error) {
        lines.push("**Error:**");
        lines.push(`- Type: ${ctx.error.type}`);
        lines.push(`- Message: ${ctx.error.message}`);
        lines.push(`- Retryable: ${ctx.error.isRetryable}`);
        lines.push("");
      }
      
      lines.push("---");
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ============================================================
// Mock Response Generator (for testing)
// ============================================================

export function generateMockModelScopeResponse(options: {
  model?: string;
  content?: string;
  reasoningContent?: string;
  finishReason?: string;
  includeUsage?: boolean;
} = {}): object {
  const {
    model = "moonshotai/Kimi-K2.5",
    content = "This is a test response.",
    reasoningContent = "",
    finishReason = "stop",
    includeUsage = true,
  } = options;
  
  return {
    id: `test-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          ...(reasoningContent && { reasoning_content: reasoningContent }),
        },
        finish_reason: finishReason,
      },
    ],
    ...(includeUsage && {
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    }),
  };
}

export function generateMockErrorResponse(options: {
  errorCode?: string;
  errorMessage?: string;
  errorType?: string;
} = {}): object {
  const {
    errorCode = "invalid_request_error",
    errorMessage = "The request is invalid.",
    errorType = "invalid_request_error",
  } = options;
  
  return {
    error: {
      message: errorMessage,
      type: errorType,
      code: errorCode,
    },
  };
}

// ============================================================
// Export debug utilities
// ============================================================

export const llmRouteDebugger = {
  validateConfig: validateLlmConfig,
  testModelScopeRoute,
  createRouteDebugger,
  generateMockModelScopeResponse,
  generateMockErrorResponse,
};

export default llmRouteDebugger;
