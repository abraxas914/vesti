/**
 * Export Conversations Ultra Minimal - 极简导出
 * 去掉所有多余元数据，只保留核心内容
 */

import type { Conversation, Message } from "~lib/types";
import type { ExportConfig, ExportResult } from "../components/ExportDialog";
import { getMessages } from "~lib/services/storageService";
import { logger } from "~lib/utils/logger";
import { compressWithKimi } from "~lib/services/kimiService";

// Kimi API Key
const KIMI_API_KEY = "sk-muB7fbXIW0ksCGDFiHkMyLBGTJrc1dum480BEQVmcvS2nPPe".trim();

/**
 * 极简导出 - 只保留内容
 */
export async function exportConversationsUltraMinimal(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  
  // 获取消息
  const messagesMap = new Map<number, Message[]>();
  await Promise.all(
    conversations.map(async (conv) => {
      const messages = await getMessages(conv.id);
      messagesMap.set(conv.id, messages);
    })
  );
  
  // 尝试使用 Kimi 压缩
  if ((contentMode === "compact" || contentMode === "summary") && KIMI_API_KEY) {
    try {
      return await exportWithKimi(conversations, messagesMap, config);
    } catch (error) {
      logger.warn("export", "Kimi failed, using local fallback", { error });
    }
  }
  
  // 本地处理
  return exportLocal(conversations, messagesMap, config);
}

/**
 * 使用 Kimi 压缩
 */
async function exportWithKimi(
  conversations: Conversation[],
  messagesMap: Map<number, Message[]>,
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;
  const parts: string[] = [];
  
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    if (messages.length === 0) continue;
    
    // 调用 Kimi
    const result = await compressWithKimi(
      KIMI_API_KEY,
      messages.map(m => ({ role: m.role, content: m.content_text })),
      contentMode === "compact" ? "compact" : "summary"
    );
    
    if (result.success) {
      // 极简格式：只保留标题和内容
      parts.push(`${conv.title || "Untitled"}\n\n${result.content}`);
    } else {
      // Kimi 失败，使用本地压缩
      const localContent = compressLocally(messages, contentMode);
      parts.push(`${conv.title || "Untitled"}\n\n${localContent}`);
    }
  }
  
  // 根据格式输出
  let content = "";
  if (format === "md") {
    content = parts.join("\n\n---\n\n");
  } else if (format === "txt") {
    content = parts.join("\n\n" + "=".repeat(40) + "\n\n");
  } else {
    // JSON
    content = JSON.stringify({
      conversations: conversations.map((conv, i) => ({
        title: conv.title,
        content: parts[i]?.split("\n\n").slice(1).join("\n\n") || "",
      }))
    }, null, 2);
  }
  
  return {
    content,
    filename: `export-${conversations.length}-${Date.now()}.${format}`,
  };
}

/**
 * 本地压缩（不使用 AI）
 */
function compressLocally(messages: Message[], mode: string): string {
  if (mode === "compact") {
    // Compact：提取关键问答
    const userMsgs = messages.filter(m => m.role === "user").slice(0, 5);
    const aiMsgs = messages.filter(m => m.role === "ai" || m.role === "assistant").slice(0, 5);
    
    const parts: string[] = [];
    
    userMsgs.forEach((m, i) => {
      parts.push(`Q${i+1}: ${m.content_text.slice(0, 200)}${m.content_text.length > 200 ? "..." : ""}`);
      if (aiMsgs[i]) {
        parts.push(`A${i+1}: ${aiMsgs[i].content_text.slice(0, 400)}${aiMsgs[i].content_text.length > 400 ? "..." : ""}`);
      }
    });
    
    return parts.join("\n\n");
  } else {
    // Summary：列出各轮概要
    return messages.map((m, i) => {
      const role = m.role === "user" ? "问" : "答";
      return `${i+1}. [${role}] ${m.content_text.slice(0, 150)}${m.content_text.length > 150 ? "..." : ""}`;
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
  const { contentMode, format } = config;
  const parts: string[] = [];
  
  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];
    const content = compressLocally(messages, contentMode);
    parts.push(`${conv.title || "Untitled"}\n\n${content}`);
  }
  
  let finalContent = "";
  if (format === "md") {
    finalContent = parts.join("\n\n---\n\n");
  } else if (format === "txt") {
    finalContent = parts.join("\n\n" + "=".repeat(40) + "\n\n");
  } else {
    finalContent = JSON.stringify({
      conversations: conversations.map((conv, i) => ({
        title: conv.title,
        content: parts[i]?.split("\n\n").slice(1).join("\n\n") || "",
      }))
    }, null, 2);
  }
  
  return {
    content: finalContent,
    filename: `export-${conversations.length}-${Date.now()}.${format}`,
  };
}
