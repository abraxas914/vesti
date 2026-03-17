import type { Message } from "../types";
import type {
  ExportCompressionPromptPayload,
  PromptVersion,
} from "./types";

const EXPORT_COMPACT_SYSTEM = `将技术对话压缩为其他AI可接续的格式。

输出必须包含以下标记：
[主题] 一句话概括
[背景] 问题背景和约束
[关键决策] 编号列表，每项包含"决策内容 - 选择理由"
[核心代码] \`\`\`语言\n完整代码\n\`\`\`
[待解决问题] 仍需处理的事项
[来源] X轮对话

规则：
1. 使用对话中实际存在的信息，不编造
2. 代码必须完整，禁止截断
3. 决策必须说明"为什么选A而不是B"
4. 去除寒暄和重复内容
5. 保留文件名、函数名、命令等具体细节
6. 如果某部分无内容，使用占位符如"无代码"或"已解决"
7. 仅输出markdown，不要包裹代码块
8. 用中文输出

示例：
[主题] React虚拟滚动实现

[背景] 需渲染10万+数据导致卡顿。使用react-window时遇到动态高度问题。

[关键决策]
1. 使用VariableSizeList替代FixedSizeList - Fixed无法处理动态高度，会导致布局错乱
2. 设置estimatedItemSize=350 - 基于业务数据80%条目在300-400px

[核心代码]
\`\`\`jsx
import { VariableSizeList } from 'react-window';
function List({ items }) {
  const getItemSize = (i) => items[i].height || 350;
  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      estimatedItemSize={350}
    >
      {({ index, style }) => <div style={style}>{items[index].content}</div>}
    </VariableSizeList>
  );
}
\`\`\`

[待解决问题] 需要测试边界情况：当列表为空时的处理

[来源] 8轮对话`;

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toTranscript(messages: Message[]): string {
  if (!messages.length) {
    return "[无消息]";
  }

  return messages
    .map((message, index) => {
      const role = message.role === "user" ? "用户" : "AI";
      return `${index + 1}. [${formatTime(message.created_at)}] [${role}] ${message.content_text}`;
    })
    .join("\n");
}

function buildCompactPrompt(payload: ExportCompressionPromptPayload): string {
  return `将以下技术对话压缩为AI Handoff格式。

元数据：
- 标题: ${payload.conversationTitle || "(未命名)"}
- 平台: ${payload.conversationPlatform || "unknown"}
- 开始时间: ${
    payload.conversationOriginAt
      ? formatDateTime(payload.conversationOriginAt)
      : "unknown"
  }
- 对话轮数: ${payload.messages.length}

对话记录：
${toTranscript(payload.messages)}

要求：
1. 严格使用系统提示中的标记格式
2. [关键决策]必须包含选择理由（为什么选这个而不是其他方案）
3. [核心代码]保持完整可运行，包含必要的import
4. 去除寒暄、重复和与主题无关的内容
5. 如果对话是中文，用中文输出；如果是英文，可以保留关键术语
6. 输出纯markdown，不要包裹在代码块中`;
}

function buildCompactFallbackPrompt(
  payload: ExportCompressionPromptPayload
): string {
  return `将以下对话压缩为简洁的AI交接格式：

标题: ${payload.conversationTitle || "(未命名)"}
轮数: ${payload.messages.length}

对话记录：
${toTranscript(payload.messages)}

必须包含以下标记：
[主题] 一句话概括
[背景] 关键背景
[关键决策] 核心决策点
[核心代码] 代码块（如有）
[来源] ${payload.messages.length}轮对话

保持简洁，但保留关键决策和代码。用中文输出。`;
}

export const CURRENT_EXPORT_COMPACT_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.0-export-compact-zh",
  createdAt: "2026-03-17",
  description: "中文AI Handoff格式，保留决策理由和完整代码",
  system: EXPORT_COMPACT_SYSTEM,
  fallbackSystem: "你是技术对话压缩助手，输出简洁的中文摘要。",
  userTemplate: buildCompactPrompt,
  fallbackTemplate: buildCompactFallbackPrompt,
};

export const EXPERIMENTAL_EXPORT_COMPACT_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.0-export-compact-zh-exp",
  createdAt: "2026-03-17",
  description: "Experimental Chinese compact export variant.",
  system: EXPORT_COMPACT_SYSTEM,
  fallbackSystem: "你是技术对话压缩助手，输出简洁的中文摘要。",
  userTemplate: buildCompactPrompt,
  fallbackTemplate: buildCompactFallbackPrompt,
};
