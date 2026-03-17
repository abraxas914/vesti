import type { Message } from "../types";
import type {
  ExportCompressionPromptPayload,
  PromptVersion,
} from "./types";

const EXPORT_SUMMARY_SYSTEM = `将技术对话整理为可直接存入Notion/Obsidian的知识卡片。

输出格式（严格遵循Markdown）：
\`\`\`markdown
# [标题] 技术主题
> [日期] | [平台] | [对话轮数]

## TL;DR
[一句话总结核心内容，包含关键数据和结果]

## 问题定义（如有）
**症状**：[问题表现]
**约束**：[限制条件]
**影响**：[影响范围]

## 方案对比（如涉及技术选型）
| 方案 | 维度1 | 维度2 | 维度3 | 决策 |
|------|-------|-------|-------|------|
| 方案A | ... | ... | ... | ❌/✅ |
| 方案B | ... | ... | ... | ❌/✅ |

## 可复用代码
### 场景1：xxx
[完整可运行的代码块]

### 场景2：xxx
[变体代码]

## 关键决策依据
1. **[决策点]**：[选择理由，包含"为什么选A而非B"]
2. **[决策点]**：[选择理由]

## 踩坑记录（如有）
- ❌ [错误做法] → [后果]
- ✅ [正确做法]

## 后续行动
- [ ] [具体可执行的任务]
- [ ] [具体可执行的任务]

## 相关资源
- [链接描述](url)
- [内部文档](wiki-link)

## 标签
#标签1 #标签2 #标签3
\`\`\`

核心原则：
1. **可复用**：读者无需看原始对话，仅看笔记就能理解并应用
2. **结构化**：清晰的层级，方便快速定位和检索
3. **完整性**：包含问题、方案、代码、决策依据、后续行动
4. **可执行**：代码可直接复制使用，步骤可立即执行
5. **决策依据**：每个选择必须说明理由

特殊场景：
- 纯调研类（无代码）：保留方案对比和决策依据，代码块写"无代码"
- 超长对话（>100轮）：按子主题拆分多个##二级标题
- 调试/排查类：必须保留 现象→排查步骤→根因→修复 的完整链条

质量自检（输出前必查）：
- [ ] TL;DR是否包含关键数据/结果？
- [ ] 代码是否完整可运行？（包含必要import）
- [ ] 是否有"为什么选这个方案"的决策依据？
- [ ] 标签是否便于检索？
- [ ] 如果我是3个月后回看，能否快速理解？`;

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: number): string {
  return new Date(value).toISOString().split("T")[0];
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

function buildSummaryPrompt(payload: ExportCompressionPromptPayload): string {
  return `将以下技术对话整理为知识卡片格式。

元数据：
- 标题: ${payload.conversationTitle || "(未命名)"}
- 平台: ${payload.conversationPlatform || "unknown"}
- 日期: ${payload.conversationOriginAt ? formatDate(payload.conversationOriginAt) : new Date().toISOString().split("T")[0]}
- 对话轮数: ${payload.messages.length}

对话记录：
${toTranscript(payload.messages)}

输出要求：
1. 严格遵循系统提示中的知识卡片格式
2. TL;DR必须包含关键数据或结果（如性能提升、问题解决等）
3. 代码块完整可运行，包含必要的import和类型定义
4. 方案对比表格要包含决策列（✅/❌）
5. 后续行动使用复选框格式（- [ ]）
6. 标签使用#开头，便于后续检索
7. 如果对话是中文，用中文输出；如果是英文，可以保留关键术语
8. 输出纯markdown，不要包裹在代码块中`;
}

function buildSummaryFallbackPrompt(
  payload: ExportCompressionPromptPayload
): string {
  return `将以下对话整理为简化的知识卡片：

标题: ${payload.conversationTitle || "(未命名)"}
平台: ${payload.conversationPlatform || "unknown"}
轮数: ${payload.messages.length}

对话记录：
${toTranscript(payload.messages)}

必须包含以下章节：
# 标题
> 日期 | 平台 | ${payload.messages.length}轮

## TL;DR
一句话总结

## 问题定义
关键问题描述

## 方案对比
简要对比（如有）

## 可复用代码
代码块或"无代码"

## 后续行动
- [ ] 待办事项

## 标签
#相关标签

保持简洁但结构完整。用中文输出。`;
}

export const CURRENT_EXPORT_SUMMARY_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.0-export-summary-zh",
  createdAt: "2026-03-17",
  description: "中文知识卡片格式，适合存入Notion/Obsidian",
  system: EXPORT_SUMMARY_SYSTEM,
  fallbackSystem: "你是知识整理助手，将对话转换为结构化的中文笔记。",
  userTemplate: buildSummaryPrompt,
  fallbackTemplate: buildSummaryFallbackPrompt,
};

export const EXPERIMENTAL_EXPORT_SUMMARY_PROMPT: PromptVersion<ExportCompressionPromptPayload> = {
  version: "v1.2.0-export-summary-zh-exp",
  createdAt: "2026-03-17",
  description: "Experimental Chinese knowledge export variant.",
  system: EXPORT_SUMMARY_SYSTEM,
  fallbackSystem: "你是知识整理助手，将对话转换为结构化的中文笔记。",
  userTemplate: buildSummaryPrompt,
  fallbackTemplate: buildSummaryFallbackPrompt,
};
