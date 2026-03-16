/**
 * Kimi Service - Kimi K2.5 API 支持
 * 提供更强大的压缩和总结能力
 * 
 * API Key 安全：通过 apiKeys.ts 模块读取，不硬编码
 */

import type { LlmConfig } from "../types";
import { logger } from "../utils/logger";
import { getKimiApiKey } from "../config/apiKeys";

const KIMI_BASE_URL = "https://api.moonshot.cn/v1";
const KIMI_MODEL = "moonshot-v1-32k";

interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface KimiResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: {
    message: string;
  };
}

export interface KimiCallResult {
  content: string;
  success: boolean;
  error?: string;
}

/**
 * 检查配置是否为 Kimi
 */
export function isKimiConfig(config: LlmConfig): boolean {
  return config.provider === "kimi" || 
         config.baseUrl?.includes("moonshot.cn") ||
         config.modelId?.includes("kimi");
}

/**
 * 构建 Kimi 请求 payload
 */
function buildKimiPayload(
  messages: KimiMessage[],
  temperature = 0.3,
  maxTokens = 8000
): Record<string, unknown> {
  return {
    model: KIMI_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages,
  };
}

/**
 * 调用 Kimi API
 */
export async function callKimi(
  prompt: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<KimiCallResult> {
  const startTime = performance.now();
  
  // 获取 API Key（从 Chrome Storage 或环境变量）
  const apiKey = await getKimiApiKey();
  
  if (!apiKey) {
    logger.error("kimi", "Kimi API Key not configured");
    return {
      content: "",
      success: false,
      error: "API Key not configured. Please set KIMI_API_KEY in settings.",
    };
  }
  
  try {
    const messages: KimiMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    
    messages.push({ role: "user", content: prompt });
    
    const payload = buildKimiPayload(
      messages,
      options?.temperature ?? 0.3,
      options?.maxTokens ?? 8000
    );
    
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("kimi", `Kimi API error: ${response.status}`, new Error(errorText));
      return {
        content: "",
        success: false,
        error: `API Error: ${response.status} - ${errorText}`,
      };
    }
    
    const data = (await response.json()) as KimiResponse;
    
    if (data.error) {
      logger.error("kimi", "Kimi API returned error", new Error(data.error.message));
      return {
        content: "",
        success: false,
        error: data.error.message,
      };
    }
    
    const content = data.choices?.[0]?.message?.content || "";
    const duration = performance.now() - startTime;
    
    logger.info("kimi", "Kimi API call successful", {
      durationMs: Math.round(duration),
      contentLength: content.length,
    });
    
    return {
      content: content.trim(),
      success: true,
    };
  } catch (error) {
    logger.error("kimi", "Kimi API call failed", error as Error);
    return {
      content: "",
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============== Compact 模式 Prompt（无截断）==============

const COMPACT_SYSTEM_PROMPT = `你是一个专业的对话压缩助手。
任务：将对话压缩为简洁但信息完整的内容，适合粘贴给其他 AI 继续对话。

重要规则：
1. 保留所有关键信息、决策和结论（禁止截断）
2. 去除寒暄、重复、确认等低信息内容  
3. 保留完整代码块（必须完整，不要省略）
4. 按以下格式输出：
   [主题] 对话主题
   [背景] 简要背景
   [关键决策] 1. 决策一 2. 决策二
   [核心代码] 完整代码块
   [待解决问题] 如果有
   [来源] X 轮对话整理
5. 总长度控制在 2000-4000 tokens（通过压缩而非截断）
6. 不要输出格式说明，只输出压缩后的内容`;

/**
 * Compact 模式压缩（无截断）
 */
export async function compressCompact(
  messages: Array<{ role: string; content: string }>,
  conversationTitle?: string
): Promise<KimiCallResult> {
  const conversationText = messages
    .map((m) => `[${m.role === "user" ? "User" : "AI"}] ${m.content}`)
    .join("\n\n");
  
  const userPrompt = `请将以下对话压缩：

对话标题：${conversationTitle || "未命名"}

${conversationText}

要求：
1. 保留所有关键决策、代码和结论（禁止截断）
2. 去除低价值的寒暄和重复内容
3. 按 [主题] [背景] [关键决策] [核心代码] [待解决问题] [来源] 格式输出
4. 通过压缩控制长度，不要截断重要信息`;
  
  return callKimi(userPrompt, COMPACT_SYSTEM_PROMPT, {
    temperature: 0.3,
    maxTokens: 2000,
  });
}

// ============== Summary 模式 Prompt（结构化）==============

const SUMMARY_SYSTEM_PROMPT = `你是一个专业的知识整理助手。
任务：将对话整理为结构化的知识笔记，适合保存到 Notion/Obsidian。

重要规则：
1. 按以下格式输出：
   # 标题
   > 日期 | 平台 | 对话数
   
   ## TL;DR
   一句话总结核心内容
   
   ## 问题定义
   要解决的问题
   
   ## 解决方案对比
   | 方案 | 效果 | 复杂度 | 决策 |
   |------|------|--------|------|
   
   ## 可复用代码
   ### 模块名
   \`\`\`语言
   完整代码
   \`\`\`
   
   ## 关键决策依据
   - 决策理由
   
   ## 后续行动
   - [ ] 待办事项
   
   ## 相关标签
   #标签1 #标签2
2. 保留完整代码块（可直接使用）
3. 使用表格对比不同方案
4. 提取待办事项（checkbox 格式）
5. 最多使用 2 级标题（##）
6. 添加相关标签（#标签 格式）
7. 不要输出格式说明，只输出整理后的内容`;

/**
 * Summary 模式压缩（结构化）
 */
export async function compressSummary(
  messages: Array<{ role: string; content: string }>,
  metadata: {
    title?: string;
    platform?: string;
    date?: string;
  }
): Promise<KimiCallResult> {
  const conversationText = messages
    .map((m) => `[${m.role === "user" ? "User" : "AI"}] ${m.content}`)
    .join("\n\n");
  
  const userPrompt = `请将以下对话整理为结构化的知识笔记。

对话标题：${metadata.title || "未命名"}
平台：${metadata.platform || "Unknown"}
日期：${metadata.date || new Date().toISOString().split("T")[0]}
对话轮数：${Math.ceil(messages.length / 2)} 轮

${conversationText}

要求：
1. 按格式输出：标题 → TL;DR → 问题定义 → 解决方案表格 → 代码 → 决策依据 → 后续行动 → 标签
2. 保留完整可复用代码
3. 使用表格对比方案
4. 提取待办事项
5. 最多 2 级标题`;
  
  return callKimi(userPrompt, SUMMARY_SYSTEM_PROMPT, {
    temperature: 0.3,
    maxTokens: 3000,
  });
}

// ============== 旧版兼容接口 ==============

/**
 * 压缩对话内容（兼容旧接口）
 * @deprecated 使用 compressCompact 或 compressSummary
 */
export async function compressWithKimi(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  mode: "compact" | "summary" | "detailed",
  metadata?: {
    title?: string;
    platform?: string;
    date?: string;
  }
): Promise<KimiCallResult> {
  if (mode === "compact") {
    return compressCompact(messages, metadata?.title);
  } else {
    return compressSummary(messages, metadata || {});
  }
}
