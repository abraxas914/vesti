/**
 * Route Test Panel for Browser Console
 * 
 * This module provides interactive testing capabilities for debugging
 * ModelScope routing issues directly from the browser console.
 * 
 * Usage:
 *   // Load the panel
 *   await import('/src/lib/services/__tests__/routeTestPanel.ts');
 *   
 *   // Run tests
 *   await window.vestiRouteTest.runAll();
 *   
 *   // Test specific functionality
 *   await window.vestiRouteTest.testConfig();
 *   await window.vestiRouteTest.testConnectivity();
 *   await window.vestiRouteTest.testWithPrompt("Your test prompt");
 */

import type { LlmConfig } from "../../types";
import { getLlmSettings } from "../llmSettingsService";
import { callInference, callModelScope, callProxyService, getLlmDiagnostic } from "../llmService";
import { validateLlmConfig, testModelScopeRoute, type RouteTestResult } from "../llmRouteDebugger";
import { globalTracer, getDiagnosticReport } from "../llmDiagnostics";
import { buildDefaultLlmSettings, getLlmAccessMode } from "../llmConfig";

// ============================================================
// Test Panel State
// ============================================================

interface TestPanelState {
  lastTestResult: RouteTestResult | null;
  testHistory: Array<{
    timestamp: number;
    type: string;
    success: boolean;
    details: unknown;
  }>;
}

const state: TestPanelState = {
  lastTestResult: null,
  testHistory: [],
};

// ============================================================
// Test Functions
// ============================================================

async function getCurrentConfig(): Promise<LlmConfig | null> {
  try {
    const settings = await getLlmSettings();
    return settings;
  } catch (error) {
    console.error("❌ Failed to get LLM settings:", error);
    return null;
  }
}

async function testConfig(): Promise<void> {
  console.log("\n🔧 Testing Configuration...\n");
  
  const config = await getCurrentConfig();
  
  if (!config) {
    console.error("❌ No configuration found!");
    console.log("💡 Run: await window.vestiRouteTest.setupDefaultConfig()");
    return;
  }

  const validation = validateLlmConfig(config);
  
  console.log("Configuration Mode:", validation.mode);
  console.log("Is Valid:", validation.isValid ? "✅" : "❌");
  
  if (validation.errors.length > 0) {
    console.log("\n❌ Errors:");
    validation.errors.forEach(err => {
      console.log(`  [${err.code}] ${err.field}: ${err.message}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    validation.warnings.forEach(warn => {
      console.log(`  [${warn.code}] ${warn.field}: ${warn.message}`);
      if (warn.suggestion) {
        console.log(`      💡 ${warn.suggestion}`);
      }
    });
  }
  
  if (validation.isValid && validation.errors.length === 0) {
    console.log("\n✅ Configuration is valid!");
  }
  
  console.log("\n📋 Full Config (redacted):", {
    mode: config.mode,
    modelId: config.modelId,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
    proxyBaseUrl: config.proxyBaseUrl,
    hasProxyToken: !!config.proxyServiceToken,
  });
  
  state.testHistory.push({
    timestamp: Date.now(),
    type: "config",
    success: validation.isValid,
    details: validation,
  });
}

async function testConnectivity(): Promise<void> {
  console.log("\n🌐 Testing Connectivity...\n");
  
  const config = await getCurrentConfig();
  
  if (!config) {
    console.error("❌ No configuration found!");
    return;
  }

  const mode = getLlmAccessMode(config);
  console.log(`Testing ${mode} mode...\n`);

  if (mode === "custom_byok") {
    const result = await testModelScopeRoute(config, { verbose: true });
    state.lastTestResult = result;
    
    console.log("Result:", result.success ? "✅ PASSED" : "❌ FAILED");
    console.log("Stage:", result.stage);
    console.log("Message:", result.message);
    
    if (Object.keys(result.details).length > 0) {
      console.log("\nDetails:", result.details);
    }
    
    if (result.suggestions.length > 0) {
      console.log("\n💡 Suggestions:");
      result.suggestions.forEach(s => console.log(`  • ${s}`));
    }
    
    state.testHistory.push({
      timestamp: Date.now(),
      type: "connectivity",
      success: result.success,
      details: result,
    });
  } else {
    // Proxy mode - test the proxy endpoint
    try {
      const proxyUrl = config.proxyBaseUrl || config.proxyUrl;
      console.log(`Testing proxy: ${proxyUrl}`);
      
      const response = await fetch(`${proxyUrl}/health`, {
        method: "GET",
        headers: {
          "x-vesti-service-token": config.proxyServiceToken || "",
        },
      });
      
      if (response.ok) {
        console.log("✅ Proxy is reachable");
        const data = await response.json().catch(() => null);
        if (data) {
          console.log("Response:", data);
        }
      } else {
        console.log("❌ Proxy returned error:", response.status, response.statusText);
      }
      
      state.testHistory.push({
        timestamp: Date.now(),
        type: "proxy_connectivity",
        success: response.ok,
        details: { status: response.status },
      });
    } catch (error) {
      console.error("❌ Proxy connectivity test failed:", error);
      state.testHistory.push({
        timestamp: Date.now(),
        type: "proxy_connectivity",
        success: false,
        details: { error: String(error) },
      });
    }
  }
}

async function testWithPrompt(prompt: string, options: { 
  useJson?: boolean; 
  stream?: boolean;
  verbose?: boolean;
} = {}): Promise<void> {
  const { useJson = false, stream = false, verbose = false } = options;
  
  console.log(`\n💬 Testing with prompt: "${prompt}"\n`);
  
  const config = await getCurrentConfig();
  
  if (!config) {
    console.error("❌ No configuration found!");
    return;
  }

  const startTime = performance.now();
  globalTracer.traceRouteSelection(config);
  
  try {
    const result = await callInference(config, prompt, {
      responseFormat: useJson ? "json_object" : undefined,
      stream,
    });
    
    const duration = performance.now() - startTime;
    
    console.log("✅ Request successful!");
    console.log(`   Duration: ${Math.round(duration)}ms`);
    console.log(`   Route: ${result.route}`);
    console.log(`   Mode: ${result.mode}`);
    console.log(`   Stream Stage: ${result.streamStage}`);
    console.log(`   Content Source: ${result.contentSource}`);
    console.log(`   Finish Reason: ${result.finishReason || "N/A"}`);
    
    if (result.usage) {
      console.log(`   Tokens: ${result.usage.totalTokens || "N/A"} ` +
        `(prompt: ${result.usage.promptTokens || "N/A"}, ` +
        `completion: ${result.usage.completionTokens || "N/A"})`);
    }
    
    if (verbose) {
      console.log("\n📄 Content Preview:");
      console.log(result.content.slice(0, 500) + (result.content.length > 500 ? "..." : ""));
    }
    
    state.testHistory.push({
      timestamp: Date.now(),
      type: "prompt",
      success: true,
      details: {
        duration,
        route: result.route,
        mode: result.mode,
        contentLength: result.content.length,
      },
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Request failed after ${Math.round(duration)}ms`);
    
    if (error instanceof Error) {
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
    }
    
    const diagnostic = getLlmDiagnostic(error);
    if (diagnostic) {
      console.error("\n📊 Diagnostic Information:");
      console.error(`   Code: ${diagnostic.code}`);
      console.error(`   Route: ${diagnostic.route}`);
      console.error(`   Status: ${diagnostic.status}`);
      console.error(`   User Message: ${diagnostic.userMessage}`);
      console.error(`   Technical: ${diagnostic.technicalSummary}`);
    }
    
    state.testHistory.push({
      timestamp: Date.now(),
      type: "prompt",
      success: false,
      details: {
        duration,
        error: error instanceof Error ? error.message : String(error),
        diagnostic: diagnostic || null,
      },
    });
  }
}

async function testJsonModes(): Promise<void> {
  console.log("\n🧪 Testing JSON Output Modes...\n");
  
  const config = await getCurrentConfig();
  
  if (!config) {
    console.error("❌ No configuration found!");
    return;
  }

  const testPrompt = `Return a JSON object with this structure:
{
  "test": true,
  "timestamp": 1234567890,
  "message": "Hello"
}`;

  console.log("Test 1: Plain text mode (no JSON enforcement)");
  await testWithPrompt(testPrompt, { useJson: false, verbose: true });
  
  console.log("\n---\n");
  
  console.log("Test 2: JSON mode (response_format: json_object)");
  await testWithPrompt(testPrompt, { useJson: true, verbose: true });
}

async function testDirectRoutes(): Promise<void> {
  console.log("\n🛤️  Testing Direct Routes...\n");
  
  const config = await getCurrentConfig();
  
  if (!config) {
    console.error("❌ No configuration found!");
    return;
  }

  const prompt = "Say 'Hello from direct route test' and nothing else.";

  // Test ModelScope direct
  console.log("Testing ModelScope direct route...");
  try {
    const startTime = performance.now();
    const result = await callModelScope(config, prompt, {});
    const duration = performance.now() - startTime;
    
    console.log("✅ ModelScope route succeeded");
    console.log(`   Duration: ${Math.round(duration)}ms`);
    console.log(`   Mode: ${result.mode}`);
    console.log(`   Content preview: ${result.content.slice(0, 100)}...`);
  } catch (error) {
    console.error("❌ ModelScope route failed:", error);
  }

  console.log("\n---\n");

  // Test Proxy route
  console.log("Testing Proxy route...");
  try {
    const startTime = performance.now();
    const result = await callProxyService(config, prompt, {});
    const duration = performance.now() - startTime;
    
    console.log("✅ Proxy route succeeded");
    console.log(`   Duration: ${Math.round(duration)}ms`);
    console.log(`   Mode: ${result.mode}`);
    console.log(`   Content preview: ${result.content.slice(0, 100)}...`);
  } catch (error) {
    console.error("❌ Proxy route failed:", error);
  }
}

async function runAllTests(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  VESTI MODELSCOPE ROUTE TEST SUITE");
  console.log("=".repeat(60) + "\n");
  
  const startTime = performance.now();
  
  await testConfig();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testConnectivity();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testWithPrompt("Generate a one-sentence summary of AI technology.", { verbose: true });
  
  const duration = performance.now() - startTime;
  
  console.log("\n" + "=".repeat(60));
  console.log(`  All tests completed in ${Math.round(duration)}ms`);
  console.log("=".repeat(60));
  
  showReport();
}

function showReport(): void {
  console.log("\n📊 DIAGNOSTIC REPORT\n");
  console.log(getDiagnosticReport());
}

function showHistory(): void {
  console.log("\n📜 Test History\n");
  
  if (state.testHistory.length === 0) {
    console.log("No tests run yet.");
    return;
  }
  
  state.testHistory.forEach((entry, index) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const icon = entry.success ? "✅" : "❌";
    console.log(`${index + 1}. [${time}] ${icon} ${entry.type}`);
  });
}

function setupDefaultConfig(): void {
  const defaultConfig = buildDefaultLlmSettings();
  console.log("📋 Default Configuration:", defaultConfig);
  console.log("\n💡 To use this config, set it via:");
  console.log("   await chrome.storage.local.set({ vesti_llm_settings: config })");
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           VESTI ROUTE TEST PANEL - HELP                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Available Commands:                                         ║
║                                                              ║
║  await window.vestiRouteTest.runAll()                        ║
║    → Run all diagnostic tests                                ║
║                                                              ║
║  await window.vestiRouteTest.testConfig()                    ║
║    → Validate current configuration                          ║
║                                                              ║
║  await window.vestiRouteTest.testConnectivity()              ║
║    → Test network connectivity                               ║
║                                                              ║
║  await window.vestiRouteTest.testPrompt("your prompt")       ║
║    → Test with a custom prompt                               ║
║                                                              ║
║  await window.vestiRouteTest.testJsonModes()                 ║
║    → Test JSON output modes                                  ║
║                                                              ║
║  await window.vestiRouteTest.testDirectRoutes()              ║
║    → Test ModelScope vs Proxy routes                         ║
║                                                              ║
║  window.vestiRouteTest.showReport()                          ║
║    → Show detailed diagnostic report                         ║
║                                                              ║
║  window.vestiRouteTest.showHistory()                         ║
║    → Show test history                                       ║
║                                                              ║
║  window.vestiRouteTest.help()                                ║
║    → Show this help message                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// ============================================================
// Export to Window
// ============================================================

const routeTestPanel = {
  runAll: runAllTests,
  testConfig,
  testConnectivity,
  testPrompt: testWithPrompt,
  testJsonModes,
  testDirectRoutes,
  showReport,
  showHistory,
  setupDefaultConfig,
  help: showHelp,
  get state() { return state; },
};

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).vestiRouteTest = routeTestPanel;
  
  console.log("🧪 Route Test Panel loaded!");
  console.log("Run: await window.vestiRouteTest.runAll()");
  console.log("Help: window.vestiRouteTest.help()");
}

export default routeTestPanel;
