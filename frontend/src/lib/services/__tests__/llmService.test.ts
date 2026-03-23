/**
 * LLM Service Tests for ModelScope Routing
 * 
 * Run these tests in your browser console or Node environment:
 * 
 * Browser DevTools:
 *   const tests = await import('/src/lib/services/__tests__/llmService.test.ts');
 *   await tests.runAllTests();
 * 
 * Or use: npm test (if Jest/Vitest is configured)
 */

import type { LlmConfig } from "../../types";
import {
  validateLlmConfig,
  testModelScopeRoute,
  generateMockModelScopeResponse,
  generateMockErrorResponse,
  type RouteTestResult,
} from "../llmRouteDebugger";
import {
  callModelScope,
  callProxyService,
  callInference,
  resolveLlmRoute,
  stripThinkBlocks,
  type ModelScopeCallResult,
} from "../llmService";
import {
  buildDefaultLlmSettings,
  MODELSCOPE_BASE_URL,
  DEFAULT_PROXY_BASE_URL,
} from "../llmConfig";
import { getLlmModelProfile, KIMI_K2_5_MODEL } from "../llmModelProfile";

// ============================================================
// Test Framework (lightweight)
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class TestRunner {
  private tests: Array<() => Promise<TestResult>> = [];
  private results: TestResult[] = [];

  test(name: string, fn: () => Promise<void> | void) {
    this.tests.push(async () => {
      const start = performance.now();
      try {
        await fn();
        return {
          name,
          passed: true,
          duration: performance.now() - start,
        };
      } catch (error) {
        return {
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: performance.now() - start,
        };
      }
    });
  }

  async runAll(): Promise<TestResult[]> {
    console.log("🧪 Running LLM Service Tests...\n");
    this.results = [];
    
    for (const test of this.tests) {
      const result = await test();
      this.results.push(result);
      
      if (result.passed) {
        console.log(`  ✅ ${result.name} (${Math.round(result.duration)}ms)`);
      } else {
        console.log(`  ❌ ${result.name}`);
        console.log(`     Error: ${result.error}`);
      }
    }
    
    this.printSummary();
    return this.results;
  }

  private printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log("\n📊 Test Summary:");
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log("\n⚠️  Failed tests:");
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   - ${r.name}`));
    }
  }
}

// ============================================================
// Test Cases
// ============================================================

const runner = new TestRunner();

// --- Config Validation Tests ---

runner.test("validateLlmConfig should pass for valid BYOK config", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: MODELSCOPE_BASE_URL,
    apiKey: "test-api-key-1234567890",
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  if (!result.isValid) {
    throw new Error(`Expected valid config, got errors: ${JSON.stringify(result.errors)}`);
  }
  if (result.mode !== "custom_byok") {
    throw new Error(`Expected mode 'custom_byok', got '${result.mode}'`);
  }
});

runner.test("validateLlmConfig should fail for missing API key in BYOK mode", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: MODELSCOPE_BASE_URL,
    apiKey: "",
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  if (result.isValid) {
    throw new Error("Expected invalid config for missing API key");
  }
  const hasApiKeyError = result.errors.some(e => e.field === "apiKey" && e.code === "MISSING");
  if (!hasApiKeyError) {
    throw new Error(`Expected 'apiKey' MISSING error, got: ${JSON.stringify(result.errors)}`);
  }
});

runner.test("validateLlmConfig should fail for invalid URL", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: "not-a-valid-url",
    apiKey: "test-key",
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  if (result.isValid) {
    throw new Error("Expected invalid config for invalid URL");
  }
  const hasUrlError = result.errors.some(e => e.field === "baseUrl" && e.code === "INVALID_URL");
  if (!hasUrlError) {
    throw new Error(`Expected URL invalid error, got: ${JSON.stringify(result.errors)}`);
  }
});

runner.test("validateLlmConfig should warn for unknown model", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: MODELSCOPE_BASE_URL,
    apiKey: "test-key",
    modelId: "unknown/model-id",
  };
  
  const result = validateLlmConfig(config);
  
  // Should be valid but with warning
  if (!result.isValid) {
    throw new Error("Config should be valid for unknown model");
  }
  const hasModelWarning = result.warnings.some(w => w.field === "modelId" && w.code === "UNKNOWN_MODEL");
  if (!hasModelWarning) {
    throw new Error(`Expected unknown model warning, got: ${JSON.stringify(result.warnings)}`);
  }
});

runner.test("validateLlmConfig should pass for valid proxy config", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "demo_proxy",
    proxyBaseUrl: DEFAULT_PROXY_BASE_URL,
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  if (!result.isValid) {
    throw new Error(`Expected valid proxy config, got errors: ${JSON.stringify(result.errors)}`);
  }
  if (result.mode !== "demo_proxy") {
    throw new Error(`Expected mode 'demo_proxy', got '${result.mode}'`);
  }
});

runner.test("validateLlmConfig should warn for missing proxy service token", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "demo_proxy",
    proxyBaseUrl: DEFAULT_PROXY_BASE_URL,
    proxyServiceToken: "",
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  const hasTokenWarning = result.warnings.some(w => w.field === "proxyServiceToken");
  if (!hasTokenWarning) {
    throw new Error(`Expected proxy service token warning`);
  }
});

// --- Route Resolution Tests ---

runner.test("resolveLlmRoute should return 'proxy' for demo_proxy mode", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "demo_proxy",
  };
  
  const route = resolveLlmRoute(config);
  
  if (route !== "proxy") {
    throw new Error(`Expected route 'proxy', got '${route}'`);
  }
});

runner.test("resolveLlmRoute should return 'modelscope' for custom_byok mode", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
  };
  
  const route = resolveLlmRoute(config);
  
  if (route !== "modelscope") {
    throw new Error(`Expected route 'modelscope', got '${route}'`);
  }
});

// --- Model Profile Tests ---

runner.test("getLlmModelProfile should return correct profile for Kimi K2.5", () => {
  const profile = getLlmModelProfile(KIMI_K2_5_MODEL);
  
  if (profile.modelFamily !== "moonshot_kimi") {
    throw new Error(`Expected family 'moonshot_kimi', got '${profile.modelFamily}'`);
  }
  if (profile.responseFormatStrategy !== "prompt_json_first") {
    throw new Error(`Expected 'prompt_json_first' strategy`);
  }
});

runner.test("getLlmModelProfile should return default profile for unknown model", () => {
  const profile = getLlmModelProfile("unknown/model");
  
  if (profile.modelFamily !== "unknown") {
    throw new Error(`Expected family 'unknown', got '${profile.modelFamily}'`);
  }
});

// --- Utility Function Tests ---

runner.test("stripThinkBlocks should remove <think> tags and content", () => {
  const input = `Here is the answer.
<think>
This is my thinking process.
Multiple lines here.
</think>
Final answer.`;
  
  const result = stripThinkBlocks(input);
  
  if (result.includes("<think>")) {
    throw new Error("Expected <think> tags to be removed");
  }
  if (result.includes("thinking process")) {
    throw new Error("Expected thinking content to be removed");
  }
  if (!result.includes("Here is the answer")) {
    throw new Error("Expected non-thinking content to be preserved");
  }
});

runner.test("stripThinkBlocks should handle case-insensitive tags", () => {
  const input = `Answer.
<THINK>
Thinking...
</THINK>
More.`;
  
  const result = stripThinkBlocks(input);
  
  if (result.includes("Thinking")) {
    throw new Error("Expected case-insensitive tag removal");
  }
});

runner.test("stripThinkBlocks should handle empty input", () => {
  const result = stripThinkBlocks("");
  
  if (result !== "") {
    throw new Error("Expected empty string for empty input");
  }
});

// --- Mock Response Tests ---

runner.test("generateMockModelScopeResponse should create valid response structure", () => {
  const response = generateMockModelScopeResponse({
    model: KIMI_K2_5_MODEL,
    content: "Test content",
  });
  
  if (!response.id) {
    throw new Error("Expected response to have id");
  }
  if (!Array.isArray(response.choices)) {
    throw new Error("Expected choices to be an array");
  }
  if (response.choices.length === 0) {
    throw new Error("Expected at least one choice");
  }
  if (response.choices[0].message?.content !== "Test content") {
    throw new Error("Expected content to match input");
  }
});

runner.test("generateMockModelScopeResponse should include reasoning_content when provided", () => {
  const response = generateMockModelScopeResponse({
    reasoningContent: "My reasoning...",
  });
  
  if (!response.choices[0].message?.reasoning_content) {
    throw new Error("Expected reasoning_content in response");
  }
});

runner.test("generateMockErrorResponse should create valid error structure", () => {
  const error = generateMockErrorResponse({
    errorCode: "rate_limit_exceeded",
    errorMessage: "Too many requests",
  });
  
  if (!error.error) {
    throw new Error("Expected error object");
  }
  if (error.error.code !== "rate_limit_exceeded") {
    throw new Error("Expected error code to match");
  }
});

// --- Edge Case Tests ---

runner.test("should handle config with undefined values gracefully", () => {
  const config = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: undefined as unknown as string,
    apiKey: undefined as unknown as string,
  };
  
  const result = validateLlmConfig(config);
  
  // Should not throw, should return validation errors
  if (result.isValid) {
    throw new Error("Expected invalid for undefined required fields");
  }
});

runner.test("should handle very long API keys", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: MODELSCOPE_BASE_URL,
    apiKey: "sk-" + "a".repeat(200),
    modelId: KIMI_K2_5_MODEL,
  };
  
  const result = validateLlmConfig(config);
  
  if (!result.isValid) {
    throw new Error("Should accept long API keys");
  }
});

runner.test("should handle special characters in model ID", () => {
  const config: LlmConfig = {
    ...buildDefaultLlmSettings(),
    mode: "custom_byok",
    baseUrl: MODELSCOPE_BASE_URL,
    apiKey: "test-key",
    modelId: "org/model-name:v1.2-test",
  };
  
  const result = validateLlmConfig(config);
  
  // Should be valid (weird but valid)
  if (!result.isValid) {
    throw new Error("Should accept model IDs with special characters");
  }
});

// --- Network Tests (skipped in CI, manual only) ---

const RUN_NETWORK_TESTS = false; // Set to true to run network tests

if (RUN_NETWORK_TESTS) {
  runner.test("[NETWORK] testModelScopeRoute should fail with invalid credentials", async () => {
    const config: LlmConfig = {
      ...buildDefaultLlmSettings(),
      mode: "custom_byok",
      baseUrl: MODELSCOPE_BASE_URL,
      apiKey: "invalid-key",
      modelId: KIMI_K2_5_MODEL,
    };
    
    const result = await testModelScopeRoute(config, { timeoutMs: 10000 });
    
    if (result.success) {
      throw new Error("Expected test to fail with invalid credentials");
    }
    if (result.stage !== "auth") {
      throw new Error(`Expected auth failure, got ${result.stage}`);
    }
  });
}

// ============================================================
// Export test runner
// ============================================================

export async function runAllTests(): Promise<TestResult[]> {
  return await runner.runAll();
}

export function getTestRunner(): TestRunner {
  return runner;
}

// Auto-run if in browser console
if (typeof window !== "undefined" && typeof (window as unknown as Record<string, unknown>).runLLMTests === "undefined") {
  (window as unknown as Record<string, unknown>).runLLMTests = runAllTests;
  console.log("💡 LLM Tests loaded. Run with: await runLLMTests()");
}

export default {
  runAllTests,
  getTestRunner,
};
