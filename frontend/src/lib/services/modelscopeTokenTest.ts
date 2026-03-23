/**
 * ModelScope Token Test Tool
 * 
 * Special diagnostic tool for testing ModelScope Access Tokens
 * and diagnosing authentication issues.
 */

import { analyzeModelScopeToken, getTokenVariants, formatTokenForInference } from "./modelscopeTokenHelper";
import { logger } from "../utils/logger";

const MODELSCOPE_BASE_URL = "https://api-inference.modelscope.cn/v1";

export interface TokenTestResult {
  success: boolean;
  variant: string;
  status: number;
  response?: string;
  error?: string;
}

export interface ComprehensiveTokenTest {
  token: string;
  analysis: ReturnType<typeof analyzeModelScopeToken>;
  tests: TokenTestResult[];
  recommendation: string;
}

/**
 * Test a specific token variant
 */
async function testTokenVariant(
  token: string,
  model: string = "Qwen/Qwen2.5-Coder-32B-Instruct"
): Promise<TokenTestResult> {
  const url = `${MODELSCOPE_BASE_URL}/chat/completions`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    const responseText = await response.text();
    
    return {
      success: response.ok,
      variant: token.slice(0, 15) + "...",
      status: response.status,
      response: response.ok ? undefined : responseText.slice(0, 500),
    };
  } catch (error) {
    return {
      success: false,
      variant: token.slice(0, 15) + "...",
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run comprehensive token test
 */
export async function testModelScopeToken(
  token: string,
  options: { model?: string; verbose?: boolean } = {}
): Promise<ComprehensiveTokenTest> {
  const { model = "Qwen/Qwen2.5-Coder-32B-Instruct", verbose = false } = options;
  
  console.log("🔐 Testing ModelScope Access Token\n");
  
  // Step 1: Analyze token
  const analysis = analyzeModelScopeToken(token);
  
  console.log("📋 Token Analysis:");
  console.log(`  Format: ${analysis.format}`);
  console.log(`  Has 'ms-' prefix: ${analysis.hasPrefix}`);
  console.log(`  UUID part: ${analysis.uuidPart.slice(0, 20)}...`);
  console.log("");
  
  if (analysis.recommendations.length > 0) {
    console.log("💡 Recommendations:");
    analysis.recommendations.forEach(r => console.log(`  • ${r}`));
    console.log("");
  }
  
  // Step 2: Test all variants
  const variants = getTokenVariants(token);
  const tests: TokenTestResult[] = [];
  
  console.log(`🧪 Testing ${variants.length} token variant(s)...\n`);
  
  for (const variant of variants) {
    const isMsPrefixed = variant.toLowerCase().startsWith("ms-");
    const label = isMsPrefixed ? "With 'ms-' prefix" : "Without 'ms-' prefix";
    
    console.log(`  Testing ${label}...`);
    const result = await testTokenVariant(variant, model);
    tests.push(result);
    
    if (result.success) {
      console.log(`    ✅ SUCCESS (Status: ${result.status})`);
    } else {
      console.log(`    ❌ FAILED (Status: ${result.status})`);
      if (result.response) {
        console.log(`       Response: ${result.response.slice(0, 100)}...`);
      }
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    }
  }
  
  // Step 3: Determine recommendation
  const successfulTest = tests.find(t => t.success);
  let recommendation: string;
  
  if (successfulTest) {
    const workingVariant = variants[tests.indexOf(successfulTest)];
    const needsPrefix = workingVariant.toLowerCase().startsWith("ms-");
    recommendation = needsPrefix 
      ? "Use token WITH 'ms-' prefix"
      : "Use token WITHOUT 'ms-' prefix (remove 'ms-')";
  } else {
    recommendation = "Token authentication failed with all variants. Please verify your token is valid and has not expired.";
  }
  
  console.log("\n📊 Test Summary:");
  console.log(`  Passed: ${tests.filter(t => t.success).length}/${tests.length}`);
  console.log(`  Recommendation: ${recommendation}`);
  
  return {
    token,
    analysis,
    tests,
    recommendation,
  };
}

/**
 * Quick test for browser console
 */
export async function quickTokenTest(token?: string): Promise<void> {
  if (!token) {
    console.error("❌ Please provide your ModelScope Access Token");
    console.log("Usage: await quickTokenTest('your-token-here')");
    return;
  }
  
  await testModelScopeToken(token, { verbose: true });
}

/**
 * Verify token and suggest correct format for VESTI
 */
export function getVestiTokenFormat(token: string): {
  shouldRemovePrefix: boolean;
  formattedToken: string;
  reason: string;
} {
  const analysis = analyzeModelScopeToken(token);
  
  if (!analysis.hasPrefix) {
    return {
      shouldRemovePrefix: false,
      formattedToken: token,
      reason: "Token doesn't have 'ms-' prefix, use as-is",
    };
  }
  
  // Based on community findings, try without prefix first
  return {
    shouldRemovePrefix: true,
    formattedToken: analysis.uuidPart,
    reason: "ModelScope API-Inference may require token without 'ms-' prefix",
  };
}

// Export to window
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).testModelScopeToken = quickTokenTest;
  (window as unknown as Record<string, unknown>).modelscopeTokenTest = {
    test: testModelScopeToken,
    analyze: analyzeModelScopeToken,
    getFormat: getVestiTokenFormat,
  };
}

export default {
  testModelScopeToken,
  quickTokenTest,
  getVestiTokenFormat,
};
