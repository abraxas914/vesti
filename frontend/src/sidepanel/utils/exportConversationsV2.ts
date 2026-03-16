/**
 * Export Conversations V2 - 新版导出功能
 * 
 * 特性：
 * 1. Full 模式：完整输出所有对话内容
 * 2. Compact 模式：无截断压缩，适合粘贴给其他 AI
 * 3. Summary 模式：结构化笔记，适合保存到 Notion/Obsidian
 * 4. API Key 安全：通过 apiKeys.ts 读取，不硬编码
 */

import type { Conversation, Message } from "~lib/types";
import type { ExportConfig, ExportResult } from "../components/ExportDialog";
import { getMessages } from "~lib/services/storageService";
import { logger } from "~lib/utils/logger";
import { compressCompact, compressSummary } from "~lib/services/kimiService";
import { hasKimiApiKey } from "~lib/config/apiKeys";

/**
 * V2 导出主函数
 */
export async function exportConversationsV2(
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
  
  // Full 模式：直接输出完整内容
  if (contentMode === "full") {
    return exportFull(conversations, messagesMap, config);
  }
  
  // 检查是否有 Kimi API Key
  const hasKimi = await hasKimiApiKey();
  
  // Compact 或 Summary 模式优先使用 AI 压缩
  if ((contentMode === "compact" || contentMode === "summary") && hasKimi) {
    try {
      return await exportWithAI(conversations, messagesMap, config);
    } catch (error) {
      logger.warn("export", "AI compression failed, using local fallback", { error });
    }
  }
  
  // 本地处理（无 AI）
  return exportLocal(conversations, messagesMap, config);
}

/**
 * Full 模式：完整导出所有内容
 */
async function exportFull(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  config: ExportConfig
): Promise<ExportResult> {
  const { format } = config;
  const parts: string[] = [];
  
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    
    if (format === "md") {
      // Markdown 格式：完整对话
      const lines: string[] = [];
      lines.push(`# ${conv.title || "Untitled"}`);
      lines.push(`> Platform: ${conv.platform} | Date: ${formatDate(conv.source_created_at || conv.created_at)}`);
      lines.push("");
      
      for (const msg of messages) {
        const role = msg.role === "user" ? "**User**" : "**AI**";
        lines.push(`${role} (${formatDate(msg.created_at)})`);
        lines.push("");
        lines.push(msg.content_text);
        lines.push("");
        lines.push("---");
        lines.push("");
      }
      
      parts.push(lines.join("\n"));
    } else if (format === "txt") {
      // 纯文本格式
      const lines: string[] = [];
      lines.push(`=${conv.title || "Untitled"}=`);
      lines.push(`Platform: ${conv.platform}`);
      lines.push("");
      
      for (const msg of messages) {
        const role = msg.role === "user" ? "USER" : "AI";
        lines.push(`[${role}] ${formatDate(msg.created_at)}`);
        lines.push(msg.content_text);
        lines.push("");
      }
      
      parts.push(lines.join("\n"));
    } else {
      // JSON 格式
      parts.push(JSON.stringify({
        id: conv.id,
        title: conv.title,
        platform: conv.platform,
        messages: messages,
      }, null, 2));
    }
  }
  
  const content = parts.join(format === "json" ? "\n,\n" : "\n\n" + "=".repeat(60) + "\n\n");
  
  return {
    content,
    filename: `vesti-export-${conversations.length}-full-${Date.now()}.${format}`,
  };
}

/**
 * 使用 AI 压缩导出
 */
async function exportWithAI(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  const parts: string[] = [];
  
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    if (messages.length === 0) continue;
    
    const messageList = messages.map(m => ({ 
      role: m.role, 
      content: m.content_text 
    }));
    
    let result;
    if (contentMode === "compact") {
      // Compact：无截断压缩
      result = await compressCompact(messageList, conv.title);
    } else {
      // Summary：结构化笔记
      result = await compressSummary(messageList, {
        title: conv.title,
        platform: conv.platform,
        date: new Date(conv.source_created_at || conv.created_at).toISOString().split("T")[0],
      });
    }
    
    if (result.success) {
      parts.push(result.content);
    } else {
      // AI 失败，使用本地压缩
      logger.warn("export", "AI failed for conversation", { 
        conversationId: conv.id, 
        error: result.error 
      });
      const localContent = compressLocally(messages, contentMode);
      parts.push(localContent);
    }
  }
  
  // 根据格式生成输出
  return formatOutput(parts, conversations, config);
}

/**
 * 本地压缩（无 AI）
 */
function compressLocally(messages: Message[], mode: string): string {
  if (mode === "compact") {
    // Compact：提取关键问答（无截断，保留完整）
    const pairs: string[] = [];
    let currentQ = "";
    let pairCount = 0;
    
    for (const msg of messages) {
      if (pairCount >= 5) break; // 最多 5 对
      
      if (msg.role === "user") {
        currentQ = msg.content_text;
      } else if (msg.role === "ai" || msg.role === "assistant") {
        if (currentQ) {
          pairs.push(`Q: ${currentQ}\n\nA: ${msg.content_text}`);
          currentQ = "";
          pairCount++;
        }
      }
    }
    
    return pairs.join("\n\n---\n\n");
  } else {
    // Summary：列出各轮概要
    return messages.map((m, i) => {
      const role = m.role === "user" ? "问" : "答";
      return `${i + 1}. [${role}] ${m.content_text.slice(0, 200)}${m.content_text.length > 200 ? "..." : ""}`;
    }).join("\n");
  }
}

/**
 * 本地导出（无 AI）
 */
async function exportLocal(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  config: ExportConfig
): Promise<ExportResult> {
  const parts: string[] = [];
  
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    const content = compressLocally(messages, config.contentMode);
    parts.push(content);
  }
  
  return formatOutput(parts, conversations, config);
}

/**
 * 格式化输出
 */
function formatOutput(
  parts: string[],
  conversations: Conversation[],
  config: ExportConfig
): ExportResult {
  const { format, contentMode } = config;
  
  let content = "";
  
  if (format === "md") {
    // Markdown 格式
    content = parts.join("\n\n---\n\n");
  } else if (format === "txt") {
    // 纯文本格式
    content = parts.join("\n\n" + "=".repeat(60) + "\n\n");
  } else {
    // JSON 格式
    content = JSON.stringify({
      exported_at: new Date().toISOString(),
      count: conversations.length,
      content_mode: contentMode,
      conversations: conversations.map((conv, i) => ({
        id: conv.id,
        title: conv.title,
        platform: conv.platform,
        compressed_content: parts[i] || "",
      })),
    }, null, 2);
  }
  
  return {
    content,
    filename: `vesti-export-${conversations.length}-${contentMode}-${Date.now()}.${format}`,
  };
}

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
