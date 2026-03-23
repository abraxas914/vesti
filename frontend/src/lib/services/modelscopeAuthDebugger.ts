/**
 * ModelScope Authentication Debugger
 * 
 * Specialized diagnostic tool for troubleshooting ModelScope API Key issues.
 */

import type { LlmConfig } from "../types";
import { logger } from "../utils/logger";
import { MODELSCOPE_BASE_URL } from "./llmConfig";

export interface AuthDebugResult {
  success: boolean;
  stage: "key_format" | "endpoint_access" | "auth_header" | "model_permission" | "rate_limit" | "unknown";
  message: string;
  details: Record<string, unknown>;
  suggestions: string[];
  rawResponse?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

export interface KeyValidationInfo {
  keyFormat: {
    isValid: boolean;
    length: number;
    prefix: string;
    pattern: string;
  };
  keyType: "sdk" | "inference" | "unknown";
  warnings: string[];
}

// ModelScope API Key 格式分析
const KEY_PATTERNS = {
  // SDK Token: 通常以 "ms-" 开头，包含多个部分
  SDK: /^ms-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  // Inference API Key: 通常较长，32-64字符
  INFERENCE: /^[a-f0-9]{32,64}$/i,
  // DashScope Key: 以 "sk-" 开头
  DASHSCOPE: /^sk-[a-f0-9]{32,}$/i,
};

/**
 * 分析 API Key 格式
 */
export function analyzeApiKey(key: string): KeyValidationInfo {
  const warnings: string[] = [];
  
  // 检查基本格式
  if (!key || key.length === 0) {
    return {
      keyFormat: { isValid: false, length: 0, prefix: "", pattern: "empty" },
      keyType: "unknown",
      warnings: ["API Key is empty"],
    };
  }

  const trimmed = key.trim();
  const prefix = trimmed.split("-")[0] || "";
  
  // 检测 Key 类型
  let keyType: "sdk" | "inference" | "unknown" = "unknown";
  let pattern = "unknown";
  let isValid = false;

  if (trimmed.startsWith("ms-")) {
    keyType = "sdk";
    pattern = "SDK Token (ms-*)";
    isValid = KEY_PATTERNS.SDK.test(trimmed);
    
    if (!isValid) {
      warnings.push("SDK token format looks incorrect. Expected: ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
    }
  } else if (trimmed.startsWith("sk-")) {
    keyType = "inference";
    pattern = "DashScope Key (sk-*)";
    isValid = KEY_PATTERNS.DASHSCOPE.test(trimmed);
    
    if (!isValid) {
      warnings.push("DashScope key format looks incorrect. Should start with 'sk-' followed by hex characters");
    }
  } else if (/^[a-f0-9]{32,64}$/i.test(trimmed)) {
    keyType = "inference";
    pattern = "Inference API Key (hex)";
    isValid = true;
  } else {
    warnings.push("Unrecognized key format. ModelScope keys typically start with 'ms-' or 'sk-'");
  }

  // 检查常见错误
  if (trimmed.includes(" ")) {
    warnings.push("Key contains spaces - this will cause authentication failures");
  }
  
  if (trimmed.length < 20) {
    warnings.push("Key seems too short for a valid ModelScope key");
  }

  return {
    keyFormat: {
      isValid,
      length: trimmed.length,
      prefix,
      pattern,
    },
    keyType,
    warnings,
  };
}

/**
 * 检查 API Key 是否可能是错误的类型
 */
export function checkKeyTypeMismatch(key: string, baseUrl: string): string[] {
  const issues: string[] = [];
  const keyInfo = analyzeApiKey(key);

  // 检查是否是 DashScope Key 但使用了 ModelScope 端点
  if (keyInfo.keyType === "inference" && key.startsWith("sk-")) {
    if (baseUrl.includes("modelscope")) {
      issues.push("You appear to be using a DashScope key (sk-*) with ModelScope endpoint.");
      issues.push("DashScope keys should use: https://dashscope.aliyuncs.com/v1/");
      issues.push("Or use a ModelScope SDK token (ms-*) for ModelScope endpoint.");
    }
  }

  // 检查是否是 ModelScope SDK Token 但使用了错误的端点
  if (keyInfo.keyType === "sdk" && key.startsWith("ms-")) {
    if (baseUrl.includes("dashscope")) {
      issues.push("You appear to be using a ModelScope SDK token with DashScope endpoint.");
      issues.push("ModelScope SDK tokens should use: https://api-inference.modelscope.cn/v1/");
    }
  }

  return issues;
}

/**
 * 执行详细的认证诊断
 */
export async function diagnoseAuthFailure(
  config: LlmConfig,
  options: {
    verbose?: boolean;
    testModels?: string[];
  } = {}
): Promise<AuthDebugResult> {
  const { verbose = false, testModels = ["moonshotai/Kimi-K2.5", "Qwen/Qwen2.5-7B-Instruct"] } = options;
  const key = config.apiKey?.trim() || "";

  logger.info("auth-debug", "Starting authentication diagnosis", { 
    baseUrl: config.baseUrl,
    keyLength: key.length,
  });

  // 阶段 1: 检查 Key 格式
  const keyAnalysis = analyzeApiKey(key);
  
  if (verbose) {
    console.log("📋 API Key Analysis:");
    console.log("  Format:", keyAnalysis.keyFormat.pattern);
    console.log("  Length:", keyAnalysis.keyFormat.length);
    console.log("  Valid:", keyAnalysis.keyFormat.isValid ? "✅" : "❌");
    console.log("  Type:", keyAnalysis.keyType);
  }

  if (keyAnalysis.warnings.length > 0) {
    return {
      success: false,
      stage: "key_format",
      message: `API Key format issue detected: ${keyAnalysis.warnings[0]}`,
      details: keyAnalysis,
      suggestions: [
        "Check your API key for typos or extra spaces",
        "Ensure you're using the correct key type for your endpoint",
        "ModelScope Inference API uses different keys than ModelScope SDK",
        "Go to https://modelscope.cn/ to get the correct key",
      ],
    };
  }

  // 阶段 2: 检查 Key 类型与端点匹配
  const typeIssues = checkKeyTypeMismatch(key, config.baseUrl);
  if (typeIssues.length > 0) {
    return {
      success: false,
      stage: "key_format",
      message: "API Key type mismatch with endpoint",
      details: { keyAnalysis, typeIssues },
      suggestions: typeIssues,
    };
  }

  // 阶段 3: 测试基本连接（不需要认证）
  try {
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const modelsUrl = `${baseUrl}/models`;
    
    const connectivityTest = await fetch(modelsUrl, {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });

    if (verbose) {
      console.log("🌐 Connectivity Test:", connectivityTest.status);
    }

    // 阶段 4: 分析 401 错误
    if (connectivityTest.status === 401) {
      const errorBody = await connectivityTest.text();
      
      // 尝试解析错误信息
      let errorDetail = "Unknown authentication error";
      try {
        const errorJson = JSON.parse(errorBody);
        errorDetail = errorJson.error?.message || errorJson.message || errorBody;
      } catch {
        errorDetail = errorBody || "Empty response";
      }

      logger.warn("auth-debug", "Authentication failed", { 
        status: 401,
        errorPreview: errorDetail.slice(0, 200),
      });

      // 根据错误内容提供具体建议
      const suggestions: string[] = [];
      
      if (key.startsWith("ms-")) {
        suggestions.push(
          "Your key (ms-*) appears to be a ModelScope SDK token.",
          "SDK tokens may NOT work with the Inference API endpoint.",
          "You need an Inference API Key from: https://modelscope.cn/my/mynotebook/api",
          "Or use the ModelScope SDK instead of the Inference API."
        );
      } else if (key.startsWith("sk-")) {
        suggestions.push(
          "Your key (sk-*) appears to be a DashScope key.",
          "For DashScope, use baseUrl: https://dashscope.aliyuncs.com/v1/",
          "Or get a ModelScope Inference API key from ModelScope console."
        );
      }

      suggestions.push(
        "Verify the key is active (not revoked or expired)",
        "Check if the key has the necessary permissions",
        "Try generating a new key from the console"
      );

      return {
        success: false,
        stage: "auth_header",
        message: `Authentication failed: ${errorDetail}`,
        details: {
          keyAnalysis,
          errorDetail,
          keyPrefix: key.slice(0, 10) + "...",
        },
        suggestions,
        rawResponse: {
          status: 401,
          headers: Object.fromEntries(connectivityTest.headers.entries()),
          body: errorDetail,
        },
      };
    }

    // 阶段 5: 测试具体模型调用
    for (const modelId of testModels) {
      const testPayload = {
        model: modelId,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      };

      const chatUrl = `${baseUrl}/chat/completions`;
      const modelTest = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify(testPayload),
      });

      if (verbose) {
        console.log(`🤖 Model Test (${modelId}):`, modelTest.status);
      }

      if (modelTest.status === 401) {
        const errorBody = await modelTest.text();
        return {
          success: false,
          stage: "model_permission",
          message: `Authentication succeeded for basic requests but failed for model ${modelId}`,
          details: {
            modelId,
            errorBody: errorBody.slice(0, 500),
          },
          suggestions: [
            `Your key may not have permission to use model: ${modelId}`,
            "Check your subscription plan includes this model",
            "Try a different model from your plan",
          ],
        };
      }

      if (modelTest.status === 404) {
        return {
          success: false,
          stage: "model_permission",
          message: `Model not found: ${modelId}`,
          details: { modelId },
          suggestions: [
            "Verify the model ID is correct",
            "Check if the model is available in your region",
          ],
        };
      }

      // 如果某个模型成功了，说明认证正常
      if (modelTest.ok) {
        return {
          success: true,
          stage: "model_permission",
          message: `Authentication successful! Model ${modelId} is accessible.`,
          details: {
            testedModel: modelId,
            status: modelTest.status,
          },
          suggestions: [],
        };
      }
    }

    // 所有模型都失败了但不是 401
    return {
      success: false,
      stage: "unknown",
      message: "Authentication test inconclusive - all model requests failed",
      details: { keyAnalysis },
      suggestions: [
        "Check ModelScope service status",
        "Verify your internet connection",
        "Try again later",
      ],
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      stage: "unknown",
      message: `Network error during diagnosis: ${errorMessage}`,
      details: { error: errorMessage },
      suggestions: [
        "Check your internet connection",
        "Verify the baseUrl is correct and reachable",
        "Check if you're behind a firewall or proxy",
      ],
    };
  }
}

/**
 * 快速检查 API Key（浏览器控制台用）
 */
export async function quickAuthCheck(apiKey: string, baseUrl?: string): Promise<void> {
  console.log("🔐 ModelScope Auth Quick Check\n");
  
  const url = baseUrl || MODELSCOPE_BASE_URL;
  const config: LlmConfig = {
    provider: "modelscope",
    baseUrl: url,
    apiKey: apiKey,
    modelId: "moonshotai/Kimi-K2.5",
    temperature: 0.3,
    maxTokens: 1600,
    updatedAt: Date.now(),
    mode: "custom_byok",
    proxyBaseUrl: "",
    proxyUrl: "",
    proxyServiceToken: "",
    gatewayLock: "modelscope",
    customModelId: "moonshotai/Kimi-K2.5",
    streamMode: "off",
    reasoningPolicy: "off",
    capabilitySource: "model_id_heuristic",
    thinkHandlingPolicy: "strip",
  };

  const result = await diagnoseAuthFailure(config, { verbose: true });

  console.log("\n" + "=".repeat(60));
  console.log("Result:", result.success ? "✅ PASSED" : "❌ FAILED");
  console.log("Stage:", result.stage);
  console.log("Message:", result.message);
  
  if (result.suggestions.length > 0) {
    console.log("\n💡 Suggestions:");
    result.suggestions.forEach(s => console.log("  •", s));
  }

  if (result.rawResponse) {
    console.log("\n📄 Raw Response:");
    console.log("  Status:", result.rawResponse.status);
    console.log("  Body:", result.rawResponse.body.slice(0, 500));
  }
}

// 导出到 window
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).modelscopeAuthDebug = {
    analyzeApiKey,
    diagnoseAuthFailure,
    quickAuthCheck,
  };
}

export default {
  analyzeApiKey,
  diagnoseAuthFailure,
  quickAuthCheck,
};
