/**
 * Export Conversations Enhanced - 增强版导出功能
 * 支持 Kimi K2.5 API 进行真正的智能压缩
 */

import type { Conversation, Message } from "~lib/types";
import type { ExportConfig, ExportResult } from "../components/ExportDialog";
import { getMessages } from "~lib/services/storageService";
import { logger } from "~lib/utils/logger";
import { compressWithKimi, isKimiConfig, buildKimiConfig } from "~lib/services/kimiService";
import { getLlmSettings } from "~lib/services/llmSettingsService";

// Kimi API Key（从环境变量或配置中获取）
// 注意：请确保 API Key 有效，如有 401 错误请更换
const KIMI_API_KEY = "sk-muB7fbXIW0ksCGDFiHkMyLBGTJrc1dum480BEQVmcvS2nPPe".trim();

function toLocalDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 主导出函数
 */
export async function exportConversationsEnhanced(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  
  // 尝试使用 Kimi 进行智能压缩
  if (contentMode === "compact" || contentMode === "summary") {
    try {
      return await exportWithKimiCompression(conversations, config);
    } catch (error) {
      logger.warn("export", "Kimi compression failed, falling back to legacy", {
        error: (error as Error).message,
      });
    }
  }
  
  // 回退到传统方式
  return exportWithLegacyFormat(conversations, config);
}

/**
 * 使用 Kimi API 进行智能压缩导出
 */
async function exportWithKimiCompression(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  
  // 获取所有对话的消息
  const messagesMap = new Map<number, Message[]>();
  await Promise.all(
    conversations.map(async (conv) => {
      const messages = await getMessages(conv.id);
      messagesMap.set(conv.id, messages);
    })
  );
  
  const startTime = performance.now();
  const compressionResults: Array<{
    conversation: Conversation;
    content: string;
    success: boolean;
  }> = [];
  
  // 逐个对话进行压缩
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    if (messages.length === 0) continue;
    
    const result = await compressWithKimi(
      KIMI_API_KEY,
      messages.map(m => ({ role: m.role, content: m.content_text })),
      contentMode === "compact" ? "compact" : "summary"
    );
    
    compressionResults.push({
      conversation: conv,
      content: result.success ? result.content : `[压缩失败: ${result.error}]`,
      success: result.success,
    });
  }
  
  const duration = performance.now() - startTime;
  logger.info("export", "Kimi compression export completed", {
    conversationCount: conversations.length,
    durationMs: Math.round(duration),
  });
  
  // 根据格式生成输出
  switch (format) {
    case "md":
      return {
        content: toMarkdownEnhanced(conversations, compressionResults, contentMode),
        filename: generateFilename(conversations.length, "md", contentMode),
      };
    case "txt":
      return {
        content: toTextEnhanced(compressionResults, contentMode),
        filename: generateFilename(conversations.length, "txt", contentMode),
      };
    case "json":
      return {
        content: toJSONEnhanced(conversations, compressionResults, contentMode),
        filename: generateFilename(conversations.length, "json", contentMode),
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * 生成 Markdown 格式（增强版，去掉多余标题）
 */
function toMarkdownEnhanced(
  conversations: Conversation[],
  results: Array<{ conversation: Conversation; content: string }>,
  mode: string
): string {
  const lines: string[] = [];
  
  // 简洁的头部信息
  lines.push(`# 对话导出 (${conversations.length}个)`);
  lines.push("");
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  lines.push("");
  
  results.forEach(({ conversation, content }, idx) => {
    // 简洁的对话分隔，不使用过多层级
    lines.push(`---`);
    lines.push("");
    lines.push(`**${idx + 1}. ${conversation.title || "未命名对话"}**`);
    lines.push(`来源: ${conversation.platform} | ${toLocalDateTime(conversation.source_created_at || conversation.created_at)}`);
    lines.push("");
    
    // 直接输出压缩内容，不添加额外标题
    lines.push(content);
    lines.push("");
  });
  
  return lines.join("\n");
}

/**
 * 生成纯文本格式（增强版）
 */
function toTextEnhanced(
  results: Array<{ conversation: Conversation; content: string }>,
  mode: string
): string {
  const lines: string[] = [];
  
  lines.push("对话导出");
  lines.push("=".repeat(50));
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  lines.push("");
  
  results.forEach(({ conversation, content }, idx) => {
    lines.push(`${idx + 1}. ${conversation.title || "未命名对话"}`);
    lines.push(`${conversation.platform} | ${toLocalDateTime(conversation.source_created_at || conversation.created_at)}`);
    lines.push("");
    lines.push(content);
    lines.push("");
    lines.push("-".repeat(40));
    lines.push("");
  });
  
  return lines.join("\n");
}

/**
 * 生成 JSON 格式（增强版）
 */
function toJSONEnhanced(
  conversations: Conversation[],
  results: Array<{ conversation: Conversation; content: string; success: boolean }>,
  mode: string
): string {
  const data = {
    exported_at: new Date().toISOString(),
    count: conversations.length,
    content_mode: mode,
    conversations: results.map(({ conversation, content, success }) => ({
      id: conversation.id,
      title: conversation.title,
      platform: conversation.platform,
      url: conversation.url,
      created_at: conversation.source_created_at || conversation.created_at,
      compressed_content: content,
      compression_success: success,
    })),
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * 传统导出方式（回退）
 */
async function exportWithLegacyFormat(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  
  // 获取所有对话的消息
  const messagesMap = new Map<number, Message[]>();
  await Promise.all(
    conversations.map(async (conv) => {
      const messages = await getMessages(conv.id);
      messagesMap.set(conv.id, messages);
    })
  );
  
  // 使用现有的导出逻辑
  switch (format) {
    case "md":
      return {
        content: toMarkdownLegacy(conversations, messagesMap, contentMode),
        filename: generateFilename(conversations.length, "md", contentMode),
      };
    case "txt":
      return {
        content: toTextLegacy(conversations, messagesMap, contentMode),
        filename: generateFilename(conversations.length, "txt", contentMode),
      };
    case "json":
      return {
        content: toJSONLegacy(conversations, messagesMap, contentMode),
        filename: generateFilename(conversations.length, "json", contentMode),
      };
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * 传统 Markdown 导出（保留但简化）
 */
function toMarkdownLegacy(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  mode: string
): string {
  const lines: string[] = [];
  
  lines.push(`# 对话导出 (${conversations.length}个)`);
  lines.push("");
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  lines.push("");
  
  conversations.forEach((conv, idx) => {
    const messages = messagesMap.get(conv.id) || [];
    
    lines.push(`---`);
    lines.push("");
    lines.push(`**${idx + 1}. ${conv.title || "未命名对话"}**`);
    lines.push(`来源: ${conv.platform} | ${toLocalDateTime(conv.source_created_at || conv.created_at)}`);
    lines.push("");
    
    if (mode === "summary") {
      // 改进的 summary 模式：列出各轮主要内容
      lines.push("**对话概要：**");
      lines.push("");
      messages.forEach((msg, msgIdx) => {
        const role = msg.role === "user" ? "问" : "答";
        const preview = msg.content_text.slice(0, 200);
        lines.push(`${msgIdx + 1}. [${role}] ${preview}${msg.content_text.length > 200 ? "..." : ""}`);
      });
    } else if (mode === "compact") {
      // 改进的 compact 模式：更好的截断策略
      const userMsgs = messages.filter((m) => m.role === "user");
      const assistantMsgs = messages.filter((m) => m.role === "assistant");
      
      if (userMsgs.length > 0) {
        lines.push("**主要问题：**");
        userMsgs.slice(0, 5).forEach((m, i) => {
          const preview = m.content_text.slice(0, 120);
          lines.push(`${i + 1}. ${preview}${m.content_text.length > 120 ? "..." : ""}`);
        });
        lines.push("");
      }
      
      if (assistantMsgs.length > 0) {
        lines.push("**核心回复：**");
        // 取前3个回复，而不是只取最后一个
        assistantMsgs.slice(0, 3).forEach((m, i) => {
          const preview = m.content_text.slice(0, 300);
          lines.push(`${i + 1}. ${preview}${m.content_text.length > 300 ? "..." : ""}`);
          lines.push("");
        });
      }
    } else {
      // full 模式保持不变
      messages.forEach((msg) => {
        const role = msg.role === "user" ? "User" : "Assistant";
        lines.push(`**${role}** (${toLocalDateTime(msg.created_at)})`);
        lines.push("");
        lines.push(msg.content_text);
        lines.push("");
      });
    }
    
    lines.push("");
  });
  
  return lines.join("\n");
}

/**
 * 传统 Text 导出
 */
function toTextLegacy(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  mode: string
): string {
  const lines: string[] = [];
  
  lines.push("对话导出");
  lines.push("=".repeat(50));
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  lines.push("");
  
  conversations.forEach((conv, idx) => {
    const messages = messagesMap.get(conv.id) || [];
    
    lines.push(`${idx + 1}. ${conv.title || "未命名对话"}`);
    lines.push(`${conv.platform} | ${toLocalDateTime(conv.source_created_at || conv.created_at)}`);
    lines.push("");
    
    if (mode === "full") {
      messages.forEach((msg) => {
        const role = msg.role === "user" ? "USER" : "AI";
        lines.push(`${role}: ${msg.content_text}`);
        lines.push("");
      });
    } else if (mode === "summary") {
      lines.push("对话概要:");
      messages.forEach((msg, i) => {
        const role = msg.role === "user" ? "问" : "答";
        lines.push(`${i + 1}. [${role}] ${msg.content_text.slice(0, 150)}...`);
      });
    } else {
      // compact
      const userMsgs = messages.filter((m) => m.role === "user").slice(0, 3);
      const assistantMsgs = messages.filter((m) => m.role === "assistant").slice(0, 3);
      
      if (userMsgs.length > 0) {
        lines.push("主要问题:");
        userMsgs.forEach((m, i) => lines.push(`${i + 1}. ${m.content_text.slice(0, 100)}...`));
        lines.push("");
      }
      
      if (assistantMsgs.length > 0) {
        lines.push("核心回复:");
        assistantMsgs.forEach((m, i) => lines.push(`${i + 1}. ${m.content_text.slice(0, 200)}...`));
        lines.push("");
      }
    }
    
    lines.push("-".repeat(40));
    lines.push("");
  });
  
  return lines.join("\n");
}

/**
 * 传统 JSON 导出
 */
function toJSONLegacy(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  mode: string
): string {
  const data = conversations.map((conv) => {
    const messages = messagesMap.get(conv.id) || [];
    return {
      id: conv.id,
      title: conv.title,
      platform: conv.platform,
      url: conv.url,
      created_at: conv.source_created_at || conv.created_at,
      updated_at: conv.updated_at,
      snippet: conv.snippet,
      messages: mode === "full" ? messages : messages.slice(0, mode === "compact" ? 6 : 3),
    };
  });
  
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      count: conversations.length,
      content_mode: mode,
      conversations: data,
    },
    null,
    2
  );
}

/**
 * 生成文件名
 */
function generateFilename(count: number, format: string, mode: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const modeSuffix = mode === "full" ? "" : `-${mode}`;
  return `vesti-${count}threads${modeSuffix}-${date}.${format}`;
}
