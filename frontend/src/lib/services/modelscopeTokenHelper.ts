/**
 * ModelScope Access Token Helper
 * 
 * Handles the special format requirements for ModelScope Access Tokens.
 * 
 * IMPORTANT DISCOVERY:
 * ModelScope Access Tokens come in the format: ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * However, when using with API-Inference service, the "ms-" prefix may need to be removed
 * depending on how the token is being used.
 * 
 * References:
 * - ModelScope uses Bearer authentication: Authorization: Bearer {token}
 * - Base URL: https://api-inference.modelscope.cn/v1/
 * - Token can be obtained from: https://modelscope.cn/my/myaccesstoken
 * - For some integrations (like Claude Code), the "ms-" prefix must be removed
 */

import { logger } from "../utils/logger";

export interface TokenAnalysis {
  original: string;
  formatted: string;
  hasPrefix: boolean;
  prefix: string | null;
  uuidPart: string;
  format: "sdk_token" | "dashscope" | "inference_api" | "unknown";
  recommendations: string[];
}

/**
 * Analyze a ModelScope Access Token
 */
export function analyzeModelScopeToken(token: string): TokenAnalysis {
  const trimmed = token.trim();
  const hasPrefix = trimmed.toLowerCase().startsWith("ms-");
  const prefix = hasPrefix ? "ms-" : null;
  const uuidPart = hasPrefix ? trimmed.slice(3) : trimmed;

  // Determine token format
  let format: TokenAnalysis["format"] = "unknown";
  if (hasPrefix && /^ms-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    format = "sdk_token";
  } else if (trimmed.startsWith("sk-")) {
    format = "dashscope";
  } else if (/^[a-f0-9]{32,64}$/i.test(trimmed)) {
    format = "inference_api";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (format === "sdk_token") {
    recommendations.push(
      "This is a ModelScope SDK Token (format: ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
      "For API-Inference, try using WITHOUT the 'ms-' prefix",
      "Format for API call: Authorization: Bearer {uuid-part-only}"
    );
  } else if (format === "dashscope") {
    recommendations.push(
      "This appears to be a DashScope key",
      "Use baseUrl: https://dashscope.aliyuncs.com/v1/",
      "Format: Authorization: Bearer {key}"
    );
  }

  return {
    original: token,
    formatted: hasPrefix ? uuidPart : trimmed,
    hasPrefix,
    prefix,
    uuidPart,
    format,
    recommendations,
  };
}

/**
 * Format token for ModelScope API-Inference
 * 
 * Based on community findings, when using ModelScope Access Token with API-Inference,
 * we should try both formats:
 * 1. With prefix: Bearer ms-xxxxxx... (standard format)
 * 2. Without prefix: Bearer xxxxxx... (some integrations require this)
 */
export function formatTokenForInference(token: string, options: { 
  removePrefix?: boolean;
} = {}): string {
  const { removePrefix = false } = options;
  const trimmed = token.trim();
  
  if (removePrefix && trimmed.toLowerCase().startsWith("ms-")) {
    const withoutPrefix = trimmed.slice(3);
    logger.info("modelscope-token", "Removed 'ms-' prefix from token", {
      originalLength: trimmed.length,
      newLength: withoutPrefix.length,
    });
    return withoutPrefix;
  }
  
  return trimmed;
}

/**
 * Get all possible token formats to try
 */
export function getTokenVariants(token: string): string[] {
  const trimmed = token.trim();
  const variants: string[] = [trimmed]; // Original format
  
  // If token has ms- prefix, also try without it
  if (trimmed.toLowerCase().startsWith("ms-")) {
    variants.push(trimmed.slice(3));
  }
  
  // If token doesn't have ms- prefix but looks like a UUID, try adding it
  if (!trimmed.toLowerCase().startsWith("ms-") && 
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
    variants.push(`ms-${trimmed}`);
  }
  
  return variants;
}

/**
 * Validate ModelScope token format
 */
export function validateModelScopeToken(token: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!token || token.trim().length === 0) {
    errors.push("Token is empty");
    return { isValid: false, errors, warnings };
  }
  
  const trimmed = token.trim();
  
  // Check for spaces
  if (trimmed.includes(" ")) {
    errors.push("Token contains spaces");
  }
  
  // Check length
  if (trimmed.length < 20) {
    errors.push("Token is too short");
  }
  
  // Check format
  if (trimmed.startsWith("ms-")) {
    if (!/^ms-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
      warnings.push("Token has 'ms-' prefix but doesn't match expected UUID format");
    }
  } else if (trimmed.startsWith("sk-")) {
    warnings.push("Token starts with 'sk-' - this might be a DashScope key, not ModelScope");
  } else if (!/^[a-f0-9-]+$/i.test(trimmed)) {
    warnings.push("Token contains unexpected characters");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Export to window for debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).modelscopeTokenHelper = {
    analyze: analyzeModelScopeToken,
    format: formatTokenForInference,
    getVariants: getTokenVariants,
    validate: validateModelScopeToken,
  };
}
