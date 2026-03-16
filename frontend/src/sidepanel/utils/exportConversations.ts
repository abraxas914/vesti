/**
 * Export Conversations - 导出功能
 * 使用传统方式导出对话
 */

import type { Conversation, Message } from "~lib/types";
import type { ExportConfig, ExportResult } from "../components/ExportDialog";
import { getMessages } from "~lib/services/storageService";
import { logger } from "~lib/utils/logger";

function toLocalDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 主导出函数
 */
export async function exportConversations(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const { contentMode, format } = config;

  // 传统导出方式
  return exportWithLegacyFormat(conversations, config);
}

/**
 * 传统导出方式
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

  const parts: string[] = [];

  for (const conv of conversations) {
    const messages = messagesMap.get(conv.id) || [];

    if (format === "md") {
      // Markdown 格式
      const lines: string[] = [];
      lines.push(`# ${conv.title || "Untitled"}`);
      lines.push(`> Platform: ${conv.platform} | Date: ${formatDate(conv.source_created_at || conv.created_at)}`);
      lines.push("");

      for (const msg of messages) {
        const role = msg.role === "user" ? "**User**" : "**AI**";
        lines.push(`${role} (${formatDate(msg.created_at)})`);
        lines.push("");
        
        // 根据 contentMode 处理内容
        let content = msg.content_text;
        if (contentMode === "compact") {
          // Compact 模式：简单截断，保留前 2000 字符
          content = truncateContent(content, 2000);
        } else if (contentMode === "summary") {
          // Summary 模式：保留前 1000 字符
          content = truncateContent(content, 1000);
        }
        // Full 模式：完整内容
        
        lines.push(content);
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
        
        let content = msg.content_text;
        if (contentMode === "compact") {
          content = truncateContent(content, 2000);
        } else if (contentMode === "summary") {
          content = truncateContent(content, 1000);
        }
        
        lines.push(content);
        lines.push("");
      }

      parts.push(lines.join("\n"));
    } else if (format === "json") {
      // JSON 格式
      const data = {
        conversation: {
          id: conv.id,
          title: conv.title,
          platform: conv.platform,
          url: conv.url,
          created_at: conv.created_at,
          source_created_at: conv.source_created_at,
        },
        messages: messages.map((m) => ({
          role: m.role,
          content: contentMode === "full" 
            ? m.content_text 
            : truncateContent(m.content_text, contentMode === "compact" ? 2000 : 1000),
          created_at: m.created_at,
        })),
      };
      parts.push(JSON.stringify(data, null, 2));
    }
  }

  const content = parts.join("\n\n" + "=".repeat(50) + "\n\n");

  logger.info("export", "Export completed", {
    conversationCount: conversations.length,
    format,
    contentMode,
  });

  return {
    content,
    filename: generateFilename(conversations.length, format, contentMode),
  };
}

/**
 * 截断内容
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "\n\n[...truncated...]";
}

/**
 * 格式化日期
 */
function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 生成文件名
 */
function generateFilename(
  count: number,
  format: string,
  mode: string
): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const ext = format === "json" ? "json" : format;
  return `vesti_export_${count}threads_${mode}_${date}.${ext}`;
}
