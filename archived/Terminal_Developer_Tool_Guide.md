# VESTI Terminal Developer 工具开发指南

**面向**: 终端开发者、Vibe Coding开发者、AI辅助编程用户  
**目标**: 构建下一代AI编程记忆管理系统  
**版本**: v1.0 | 2026年3月

---

## 目录

1. [产品定位与核心价值](#1-产品定位与核心价值)
2. [终端开发者痛点分析](#2-终端开发者痛点分析)
3. [架构设计](#3-架构设计)
4. [核心模块实现](#4-核心模块实现)
5. [Vibe Coding专项功能](#5-vibe-coding专项功能)
6. [开发路线图](#6-开发路线图)
7. [竞品差异化](#7-竞品差异化)

---

## 1. 产品定位与核心价值

### 1.1 产品定位

**VESTI Terminal** 是专为终端开发者和Vibe Coding场景设计的AI编程对话捕获、压缩、检索系统。

**核心价值主张**:
> "你的AI编程助手不会记住任何事情，但VESTI会"

### 1.2 目标用户画像

**用户类型A: 终端开发者**
- 使用Claude Code、Aider、Continue.dev进行开发
- 在终端中完成80%的编程工作
- 需要快速检索过去的解决方案
- 痛点: 终端对话历史完全不可搜索

**用户类型B: Vibe Coding开发者**
- 通过自然语言与AI协作编写代码
- 会话通常很长（50-200轮）
- 产生大量代码片段和架构决策
- 痛点: 无法追踪代码演进历史

**用户类型C: 全栈AI用户**
- 同时使用浏览器AI和终端AI
- 需要统一的对话管理界面
- 痛点: 两个世界的割裂

---

## 2. 终端开发者痛点分析

### 2.1 核心痛点矩阵

| 痛点 | 频率 | 影响 | 现有解决方案 | VESTI方案 |
|-----|------|------|------------|----------|
| **终端对话无法导出** | 每次会话 | 🔴 极高 | 无 | ✅ 自动捕获 |
| **Thinking内容丢失** | 每次解决复杂问题 | 🔴 极高 | 截图/复制 | ✅ 完整保留 |
| **代码决策无法追溯** | 每周多次 | 🟠 高 | Git历史 | ✅ 决策链追踪 |
| **跨会话搜索困难** | 每天 | 🟠 高 | grep/记忆 | ✅ 语义搜索 |
| **与浏览器AI割裂** | 每天 | 🟡 中 | 手动整理 | ✅ 统一视图 |
| **长会话占用上下文** | 每次长会话 | 🟠 高 | /compact | ✅ 智能压缩 |
| **代码片段散落** | 每天 | 🟠 高 | 手动保存 | ✅ 自动提取 |

### 2.2 真实用户场景

**场景1: 解决过的bug再次出现**
```
开发者: "我记得3周前用Claude Code解决过类似的并发问题..."
现状: 无法找到当时的对话
VESTI: 搜索"concurrency race condition" → 找到对话 → 查看解决方案
```

**场景2: Vibe Coding项目回顾**
```
开发者: "这个架构是怎么演进来的？"
现状: 看Git历史猜测
VESTI: 查看时间线 → 看到架构决策链 → 理解演进逻辑
```

**场景3: 跨平台知识整合**
```
开发者: "我在Claude.ai上调研的方案，现在要在Claude Code里实现"
现状: 两个窗口切换
VESTI: 统一搜索显示两个来源的相关内容
```

---

## 3. 架构设计

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VESTI Terminal Extension                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Terminal Adapter Layer                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Claude Code  │  │    Aider     │  │    Continue.dev          │  │   │
│  │  │   Adapter    │  │   Adapter    │  │      Adapter             │  │   │
│  │  │              │  │              │  │                          │  │   │
│  │  │ • File Watch │  │ • File Watch │  │ • File Watch             │  │   │
│  │  │ • JSONL Parse│  │ • MD Parse   │  │ • JSON Parse             │  │   │
│  │  │ • Thinking   │  │ • Code Block │  │ • Context Extraction     │  │   │
│  │  │ • Tool Calls │  │ • Git Info   │  │ • Editor Integration     │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │   │
│  │         │                 │                      │                  │   │
│  │         └─────────────────┼──────────────────────┘                  │   │
│  │                           ▼                                         │   │
│  │              ┌─────────────────────────┐                            │   │
│  │              │   Unified Terminal      │                            │   │
│  │              │   Message Format        │                            │   │
│  │              │                         │                            │   │
│  │              │ • role (user/assistant) │                            │   │
│  │              │ • content (text/code)   │                            │   │
│  │              │ • thinking (reasoning)  │                            │   │
│  │              │ • tool_calls            │                            │   │
│  │              │ • git_context           │                            │   │
│  │              │ • file_context          │                            │   │
│  │              └───────────┬─────────────┘                            │   │
│  │                          │                                          │   │
│  │                          ▼                                          │   │
│  │              ┌─────────────────────────┐                            │   │
│  │              │   Context Enricher      │                            │   │
│  │              │                         │                            │   │
│  │              │ • Git branch/commit     │                            │   │
│  │              │ • Working directory     │                            │   │
│  │              │ • File snapshots        │                            │   │
│  │              │ • Code diff association │                            │   │
│  │              └───────────┬─────────────┘                            │   │
│  └──────────────────────────┼──────────────────────────────────────────┘   │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VESTI Core Pipeline                              │   │
│  │                                                                     │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │   │
│  │  │   PACS      │ → │  Smart      │ → │   IndexedDB Storage     │   │   │
│  │  │ Compression │   │  Router     │   │   (with Terminal Schema)│   │   │
│  │  │             │   │             │   │                         │   │   │
│  │  │ • Semantic  │   │ • Auto-tier │   │ • conversations         │   │   │
│  │  │ • Hierarchy │   │ • Quality   │   │ • messages              │   │   │
│  │  │ • Knowledge │   │   Gate      │   │ • code_snippets         │   │   │
│  │  │             │   │             │   │ • decisions             │   │   │
│  │  └─────────────┘   └─────────────┘   └─────────────────────────┘   │   │
│  │                                                                     │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │   │
│  │  │   Insight   │   │   Export    │   │   RAG/Search            │   │   │
│  │  │ Generation  │   │   Service   │   │   Engine                │   │   │
│  │  │             │   │             │   │                         │   │   │
│  │  │ • Code      │   │ • Markdown  │   │ • Semantic              │   │   │
│  │  │   patterns  │   │ • JSON      │   │ • Code-aware            │   │   │
│  │  │ • Decision  │   │ • Code      │   │ • Cross-platform        │   │   │
│  │  │   tracking  │   │   files     │   │                         │   │   │
│  │  └─────────────┘   └─────────────┘   └─────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 数据库Schema扩展

```typescript
// Terminal-specific schema extensions

interface TerminalConversation {
  // 继承自基础Conversation
  id: number;
  uuid: string;
  platform: Platform; // 新增: 'ClaudeCode' | 'Aider' | 'ContinueDev'
  title: string;
  
  // Terminal特有字段
  terminalMetadata: {
    tool: 'claude-code' | 'aider' | 'continue-dev' | 'warp';
    projectPath: string;           // 工作目录
    gitBranch?: string;            // Git分支
    gitCommit?: string;            // 提交哈希
    sessionId: string;             // 终端会话ID
    shell: string;                 // bash/zsh/fish
    terminalType?: string;         // iTerm/Terminal/Warp
  };
  
  // 代码上下文
  codeContext: {
    filesReferenced: string[];     // 被AI读取的文件
    filesModified: string[];       // 被AI修改的文件
    codeSnippets: CodeSnippet[];   // 提取的代码片段
    languages: string[];           // 涉及的编程语言
  };
  
  // 统计信息
  stats: {
    messageCount: number;
    userMessageCount: number;
    aiMessageCount: number;
    thinkingMessageCount: number;  // AI思考过程数量
    toolCallCount: number;         // 工具调用次数
    codeBlockCount: number;        // 代码块数量
    duration: number;              // 会话持续时间
  };
}

interface TerminalMessage {
  // 继承自基础Message
  id: number;
  conversation_id: number;
  role: 'user' | 'ai';
  content_text: string;
  
  // Terminal特有字段
  terminalContent: {
    // 对于AI消息
    thinking?: string;             // AI思考过程 (Claude Code特有)
    toolCalls?: ToolCall[];        // 工具调用
    toolResults?: ToolResult[];    // 工具结果
    
    // 代码相关
    codeBlocks?: CodeBlock[];      // 提取的代码块
    commands?: string[];           // 执行的命令
    fileOperations?: FileOperation[];
  };
  
  // 时间戳 (更精确)
  timestamps: {
    created: number;
    local?: string;                // 本地时间字符串
  };
  
  // 消息关系
  parentMessageId?: string;        // 父消息UUID (用于树形结构)
  messageType: 'message' | 'tool_use' | 'tool_result' | 'progress';
}

interface CodeSnippet {
  id: string;
  conversation_id: number;
  message_id: number;
  
  // 代码内容
  code: string;
  language: string;
  
  // 上下文
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  
  // 元数据
  type: 'generated' | 'modified' | 'referenced' | 'explained';
  description?: string;            // AI对这段代码的说明
  
  // 用于搜索
  embedding?: Float32Array;
}

interface Decision {
  id: string;
  conversation_id: number;
  
  // 决策内容
  decision: string;                // 决策描述
  rationale: string;               // 理由
  alternatives?: string[];         // 备选方案
  
  // 上下文
  timestamp: number;
  messageId: string;               // 关联的消息
  
  // 代码影响
  filesAffected: string[];
  codeSnippetIds: string[];
  
  // 分类
  category: 'architecture' | 'implementation' | 'dependency' | 'performance' | 'security';
  importance: 'critical' | 'high' | 'medium' | 'low';
}
```

---

## 4. 核心模块实现

### 4.1 Terminal Adapter架构

基于VESTI现有的IParser接口，扩展终端适配器：

```typescript
// src/lib/terminal/adapters/ITerminalAdapter.ts

import type { IParser, ParsedMessage } from "../core/parser/IParser";

export interface TerminalMetadata {
  tool: 'claude-code' | 'aider' | 'continue-dev';
  projectPath: string;
  gitBranch?: string;
  gitCommit?: string;
  sessionId: string;
  shell: string;
}

export interface ParsedTerminalMessage extends ParsedMessage {
  thinking?: string;               // AI思考过程
  toolCalls?: ToolCall[];          // 工具调用
  toolResults?: ToolResult[];      // 工具结果
  codeBlocks?: CodeBlock[];        // 代码块
  timestamp: number;
  parentUuid?: string;             // 消息树关系
  messageType: 'message' | 'tool_use' | 'tool_result' | 'progress';
}

export interface ITerminalAdapter extends IParser {
  // 文件系统监控
  watchPaths: string[];
  setupWatcher(): Promise<void>;
  teardownWatcher(): Promise<void>;
  
  // 增量解析
  parseIncremental(filePath: string, lastPosition: number): Promise<{
    messages: ParsedTerminalMessage[];
    newPosition: number;
  }>;
  
  // 元数据提取
  getTerminalMetadata(): TerminalMetadata;
  getGitContext(): Promise<GitContext>;
  
  // 代码提取
  extractCodeBlocks(content: string): CodeBlock[];
  extractDecisions(messages: ParsedTerminalMessage[]): Decision[];
}
```

### 4.2 Claude Code Adapter实现

```typescript
// src/lib/terminal/adapters/ClaudeCodeAdapter.ts

import type { ITerminalAdapter, TerminalMetadata, ParsedTerminalMessage } from "./ITerminalAdapter";
import { watch } from "chokidar";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { execSync } from "child_process";

interface ClaudeMessage {
  type: 'user' | 'assistant' | 'progress' | 'file-history-snapshot';
  uuid?: string;
  parentUuid?: string;
  sessionId: string;
  timestamp: string;
  cwd?: string;
  gitBranch?: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | ClaudeContentBlock[];
  };
}

type ClaudeContentBlock =
  | { type: 'thinking'; thinking: string }
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown };

export class ClaudeCodeAdapter implements ITerminalAdapter {
  private watcher?: ReturnType<typeof watch>;
  private filePositions = new Map<string, number>();
  
  watchPaths = [
    '~/.claude/projects/**/*.jsonl',
    '~/.claude/history.jsonl'
  ];

  detect(): Platform | null {
    // 检查Claude Code是否安装
    try {
      execSync('which claude', { stdio: 'ignore' });
      return 'ClaudeCode';
    } catch {
      return null;
    }
  }

  async setupWatcher(): Promise<void> {
    this.watcher = watch(this.watchPaths, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const lastPosition = this.filePositions.get(filePath) || 0;
    const result = await this.parseIncremental(filePath, lastPosition);
    
    // 更新位置
    this.filePositions.set(filePath, result.newPosition);
    
    // 发送消息到pipeline
    if (result.messages.length > 0) {
      await this.sendToPipeline(result.messages);
    }
  }

  async parseIncremental(
    filePath: string, 
    lastPosition: number
  ): Promise<{ messages: ParsedTerminalMessage[]; newPosition: number }> {
    const messages: ParsedTerminalMessage[] = [];
    
    const stream = createReadStream(filePath, { start: lastPosition });
    const rl = createInterface({ input: stream });
    
    let bytesRead = lastPosition;
    
    for await (const line of rl) {
      bytesRead += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
      
      try {
        const msg: ClaudeMessage = JSON.parse(line);
        const parsed = this.parseClaudeMessage(msg);
        if (parsed) {
          messages.push(parsed);
        }
      } catch (e) {
        console.error('Failed to parse line:', line.slice(0, 100));
      }
    }
    
    return { messages, newPosition: bytesRead };
  }

  private parseClaudeMessage(msg: ClaudeMessage): ParsedTerminalMessage | null {
    // 跳过非对话消息
    if (msg.type === 'progress' || msg.type === 'file-history-snapshot') {
      return null;
    }

    if (!msg.message) return null;

    const { text, thinking, toolCalls, toolResults } = 
      this.extractContent(msg.message.content);

    return {
      role: msg.message.role === 'user' ? 'user' : 'ai',
      textContent: text,
      thinking,
      toolCalls,
      toolResults,
      codeBlocks: this.extractCodeBlocks(text),
      timestamp: new Date(msg.timestamp).getTime(),
      parentUuid: msg.parentUuid,
      messageType: this.determineMessageType(msg),
      contentAst: null,
      contentAstVersion: undefined
    };
  }

  private extractContent(
    content: string | ClaudeContentBlock[]
  ): {
    text: string;
    thinking?: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
  } {
    if (typeof content === 'string') {
      return { text: content };
    }

    const parts = {
      text: [] as string[],
      thinking: [] as string[],
      toolCalls: [] as ToolCall[],
      toolResults: [] as ToolResult[]
    };

    for (const block of content) {
      switch (block.type) {
        case 'text':
          if (block.text) parts.text.push(block.text);
          break;
        case 'thinking':
          if (block.thinking) parts.thinking.push(block.thinking);
          break;
        case 'tool_use':
          parts.toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input
          });
          break;
        case 'tool_result':
          parts.toolResults.push({
            toolUseId: block.tool_use_id,
            content: block.content
          });
          break;
      }
    }

    return {
      text: parts.text.join('\n'),
      thinking: parts.thinking.join('\n') || undefined,
      toolCalls: parts.toolCalls.length > 0 ? parts.toolCalls : undefined,
      toolResults: parts.toolResults.length > 0 ? parts.toolResults : undefined
    };
  }

  extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlock[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        type: 'referenced'
      });
    }

    return blocks;
  }

  extractDecisions(messages: ParsedTerminalMessage[]): Decision[] {
    const decisions: Decision[] = [];
    
    for (const msg of messages) {
      if (msg.role !== 'ai') continue;
      
      // 基于启发式规则提取决策
      const decisionPatterns = [
        /(?:decided|decision|choose|chosen|opted|going with)\s+(?:to\s+)?(.+?)(?:\.|\n)/i,
        /(?:recommend|suggest)\s+(?:that\s+)?(?:we\s+)?(.+?)(?:\.|\n)/i,
        /(?:best\s+approach|best\s+practice)\s+(?:is\s+)?(?:to\s+)?(.+?)(?:\.|\n)/i
      ];
      
      for (const pattern of decisionPatterns) {
        const match = msg.textContent.match(pattern);
        if (match) {
          decisions.push({
            id: generateUUID(),
            decision: match[1].trim(),
            rationale: msg.thinking || msg.textContent.slice(0, 500),
            timestamp: msg.timestamp,
            messageId: msg.parentUuid || '',
            filesAffected: [],
            codeSnippetIds: [],
            category: this.categorizeDecision(match[1]),
            importance: 'medium'
          });
        }
      }
    }
    
    return decisions;
  }

  getTerminalMetadata(): TerminalMetadata {
    // 从最近的JSONL文件提取
    const sessionFile = this.getLatestSessionFile();
    // ... 解析获取元数据
    
    return {
      tool: 'claude-code',
      projectPath: process.cwd(),
      sessionId: '',
      shell: process.env.SHELL || 'unknown'
    };
  }

  async getGitContext(): Promise<GitContext> {
    try {
      const branch = execSync('git branch --show-current', { 
        encoding: 'utf8',
        cwd: this.getProjectPath()
      }).trim();
      
      const commit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        cwd: this.getProjectPath()
      }).trim();
      
      return { branch, commit, isDirty: false };
    } catch {
      return { branch: undefined, commit: undefined, isDirty: false };
    }
  }

  // IParser接口实现
  getConversationTitle(): string {
    // 从第一条用户消息生成标题
    return '';
  }

  getMessages(): ParsedMessage[] {
    // 返回所有已解析的消息
    return [];
  }

  isGenerating(): boolean {
    // 检查是否正在生成回复
    return false;
  }

  getSessionUUID(): string | null {
    return null;
  }

  getSourceCreatedAt(): number | null {
    return null;
  }

  // ... 其他辅助方法
}
```

### 4.3 Context Enricher

```typescript
// src/lib/terminal/enrichers/ContextEnricher.ts

export class ContextEnricher {
  async enrich(
    messages: ParsedTerminalMessage[],
    metadata: TerminalMetadata
  ): Promise<EnrichedConversation> {
    // 1. 获取Git上下文
    const gitContext = await this.getGitContext(metadata.projectPath);
    
    // 2. 提取代码片段
    const codeSnippets = this.extractAllCodeBlocks(messages);
    
    // 3. 识别文件引用
    const fileReferences = this.extractFileReferences(messages);
    
    // 4. 提取决策
    const decisions = this.extractDecisions(messages);
    
    // 5. 生成会话标题
    const title = this.generateTitle(messages);
    
    return {
      title,
      metadata: {
        ...metadata,
        gitContext
      },
      messages,
      codeSnippets,
      fileReferences,
      decisions,
      stats: this.calculateStats(messages)
    };
  }

  private async getGitContext(projectPath: string): Promise<GitContext> {
    // 使用simple-git或exec获取Git信息
    return {
      branch: await this.execGit('branch --show-current', projectPath),
      commit: await this.execGit('rev-parse HEAD', projectPath),
      commitMsg: await this.execGit('log -1 --pretty=%B', projectPath),
      isDirty: (await this.execGit('status --porcelain', projectPath)).length > 0
    };
  }

  private extractFileReferences(messages: ParsedTerminalMessage[]): string[] {
    const references = new Set<string>();
    const filePatterns = [
      /`([^`]+\.(ts|js|py|rs|go|java|cpp|c|h|jsx|tsx|vue|svelte))`/g,
      /(?:file|path):\s*`?([^`\n]+\.(ts|js|py|rs|go|java|cpp|c|h))/gi,
      /(?:in|from|to)\s+`?([\w\/\-]+\.(ts|js|py|rs|go))/gi
    ];

    for (const msg of messages) {
      for (const pattern of filePatterns) {
        let match;
        while ((match = pattern.exec(msg.textContent)) !== null) {
          references.add(match[1]);
        }
      }
    }

    return Array.from(references);
  }

  private generateTitle(messages: ParsedTerminalMessage[]): string {
    // 基于第一条用户消息和AI回复生成标题
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      return firstUserMsg.textContent.slice(0, 50) + 
             (firstUserMsg.textContent.length > 50 ? '...' : '');
    }
    return 'Untitled Terminal Session';
  }
}
```

### 4.4 PACS for Terminal

```typescript
// src/lib/terminal/compression/TerminalCompressionConfig.ts

import type { CompressionScenario } from "../compression/types";

// Terminal-specific compression scenarios
export const TerminalCompressionScenarios: Record<string, CompressionScenario> = {
  // Vibe Coding长会话压缩
  VIBE_CODING: {
    name: 'vibe_coding',
    targetLevel: 'knowledge',      // 使用知识图谱提取
    qualityThreshold: 0.85,
    maxLatency: 2000,
    useCache: true,
    // 保留代码块和关键决策
    preservePatterns: [
      /```[\s\S]*?```/,            // 代码块
      /(?:decision|decided|choose):.+/i,  // 决策
      /TODO|FIXME|XXX|HACK/i        // 标记
    ]
  },
  
  // 快速查询会话
  QUICK_QUERY: {
    name: 'quick_query',
    targetLevel: 'semantic',       // 轻量语义压缩
    qualityThreshold: 0.7,
    maxLatency: 500,
    useCache: true
  },
  
  // 代码审查会话
  CODE_REVIEW: {
    name: 'code_review',
    targetLevel: 'hierarchical',   // 分层摘要
    qualityThreshold: 0.9,
    maxLatency: 1500,
    useCache: true,
    preservePatterns: [
      /```diff[\s\S]*?```/,        // Diff代码块
      /(?:issue|problem|concern|suggestion):.+/i
    ]
  },
  
  // 架构讨论
  ARCHITECTURE: {
    name: 'architecture',
    targetLevel: 'knowledge',
    qualityThreshold: 0.9,
    maxLatency: 3000,
    useCache: true,
    // 提取架构决策记录(ADR)
    extractADR: true
  }
};

// Auto-detect scenario based on conversation characteristics
export function detectScenario(
  messages: ParsedTerminalMessage[]
): CompressionScenario {
  const characteristics = analyzeConversation(messages);
  
  // Vibe Coding特征: 长会话 + 大量代码
  if (characteristics.messageCount > 50 && 
      characteristics.codeBlockRatio > 0.3) {
    return TerminalCompressionScenarios.VIBE_CODING;
  }
  
  // 代码审查特征: 包含diff
  if (characteristics.hasDiffBlocks) {
    return TerminalCompressionScenarios.CODE_REVIEW;
  }
  
  // 架构讨论特征: 长回复 + 决策词汇
  if (characteristics.avgResponseLength > 500 &&
      characteristics.decisionKeywords > 5) {
    return TerminalCompressionScenarios.ARCHITECTURE;
  }
  
  // 默认快速查询
  return TerminalCompressionScenarios.QUICK_QUERY;
}
```

---

## 5. Vibe Coding专项功能

### 5.1 代码演进追踪

```typescript
// src/lib/terminal/features/CodeEvolutionTracker.ts

interface CodeEvolution {
  snippetId: string;
  conversationId: number;
  evolution: CodeVersion[];
}

interface CodeVersion {
  timestamp: number;
  code: string;
  changeType: 'generated' | 'modified' | 'refactored' | 'optimized';
  description: string;
  messageId: string;
}

export class CodeEvolutionTracker {
  // 追踪同一代码片段在不同会话中的演进
  async trackEvolution(snippetId: string): Promise<CodeEvolution> {
    // 1. 获取代码片段的embedding
    const snippet = await db.code_snippets.get(snippetId);
    
    // 2. 搜索相似代码片段
    const similarSnippets = await this.findSimilarSnippets(
      snippet.embedding,
      0.85  // 相似度阈值
    );
    
    // 3. 按时间排序构建演进链
    const evolution = similarSnippets
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((s, index, arr) => ({
        timestamp: s.timestamp,
        code: s.code,
        changeType: this.determineChangeType(
          index > 0 ? arr[index - 1].code : null,
          s.code
        ),
        description: s.description,
        messageId: s.message_id
      }));
    
    return {
      snippetId,
      conversationId: snippet.conversation_id,
      evolution
    };
  }

  private determineChangeType(
    prevCode: string | null,
    currCode: string
  ): CodeVersion['changeType'] {
    if (!prevCode) return 'generated';
    
    const similarity = calculateSimilarity(prevCode, currCode);
    
    if (similarity > 0.9) return 'modified';
    if (similarity > 0.7) return 'refactored';
    return 'optimized';
  }
}
```

### 5.2 决策链可视化

```typescript
// src/lib/terminal/features/DecisionChainVisualizer.ts

interface DecisionNode {
  id: string;
  decision: string;
  rationale: string;
  timestamp: number;
  category: Decision['category'];
  parentDecisionId?: string;
  childDecisionIds: string[];
  filesAffected: string[];
  codeSnippetIds: string[];
}

export class DecisionChainVisualizer {
  // 构建项目决策树
  async buildDecisionTree(projectPath: string): Promise<DecisionNode[]> {
    // 1. 获取项目的所有决策
    const decisions = await db.decisions
      .where('projectPath')
      .equals(projectPath)
      .sortBy('timestamp');
    
    // 2. 构建决策关系
    const nodes: DecisionNode[] = decisions.map(d => ({
      id: d.id,
      decision: d.decision,
      rationale: d.rationale,
      timestamp: d.timestamp,
      category: d.category,
      childDecisionIds: [],
      filesAffected: d.filesAffected,
      codeSnippetIds: d.codeSnippetIds
    }));
    
    // 3. 关联父子决策
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (this.isRelatedDecision(nodes[i], nodes[j])) {
          nodes[i].childDecisionIds.push(nodes[j].id);
          nodes[j].parentDecisionId = nodes[i].id;
        }
      }
    }
    
    return nodes;
  }

  private isRelatedDecision(parent: DecisionNode, child: DecisionNode): boolean {
    // 检查文件重叠
    const fileOverlap = parent.filesAffected.some(f => 
      child.filesAffected.includes(f)
    );
    
    // 检查时间接近度（30分钟内）
    const timeClose = (child.timestamp - parent.timestamp) < 30 * 60 * 1000;
    
    // 检查语义相似度
    const semanticSimilar = calculateSimilarity(
      parent.decision,
      child.decision
    ) > 0.6;
    
    return fileOverlap && timeClose && semanticSimilar;
  }
}
```

### 5.3 Vibe Coding仪表板

```typescript
// src/lib/terminal/features/VibeCodingDashboard.ts

interface VibeCodingStats {
  // 时间分布
  dailyActivity: {
    date: string;
    sessions: number;
    messages: number;
    codeBlocks: number;
  }[];
  
  // 语言分布
  languageDistribution: {
    language: string;
    linesOfCode: number;
    sessions: number;
  }[];
  
  // 决策统计
  decisionStats: {
    total: number;
    byCategory: Record<Decision['category'], number>;
    reversed: number;  // 被推翻的决策
  };
  
  // 生产力指标
  productivityMetrics: {
    avgSessionDuration: number;
    avgMessagesPerSession: number;
    codeReuseRate: number;  // 代码复用率
    decisionConfidence: number;
  };
}

export class VibeCodingDashboard {
  async generateStats(
    projectPath: string,
    timeRange: { start: Date; end: Date }
  ): Promise<VibeCodingStats> {
    // 聚合统计数据
    return {
      dailyActivity: await this.calculateDailyActivity(projectPath, timeRange),
      languageDistribution: await this.calculateLanguageDistribution(projectPath),
      decisionStats: await this.calculateDecisionStats(projectPath),
      productivityMetrics: await this.calculateProductivityMetrics(projectPath)
    };
  }
}
```

---

## 6. 开发路线图

### Phase 1: Foundation (4周)

**目标**: 基础捕获能力

**Week 1-2: Adapter Framework**
- [ ] 设计ITerminalAdapter接口
- [ ] 实现文件系统watcher
- [ ] 增量解析器基础

**Week 3-4: Claude Code Support**
- [ ] JSONL解析器
- [ ] Thinking内容提取
- [ ] Tool call解析
- [ ] 基础存储集成

**Deliverable**: 可捕获Claude Code对话

### Phase 2: Context & Enrichment (3周)

**目标**: 上下文感知

**Week 5-6: Git Integration**
- [ ] Git上下文提取
- [ ] 分支/提交关联
- [ ] 代码diff关联

**Week 7: Code Extraction**
- [ ] 代码块提取和存储
- [ ] 语言检测
- [ ] Embedding生成

**Deliverable**: 带Git上下文的完整对话

### Phase 3: PACS for Terminal (3周)

**目标**: 智能压缩

**Week 8-9: Terminal Scenarios**
- [ ] Vibe Coding场景
- [ ] 代码审查场景
- [ ] 快速查询场景

**Week 10: Quality Gate**
- [ ] 代码保留保证
- [ ] 决策保留保证
- [ ] 自动降级

**Deliverable**: 压缩率60-80%的终端对话

### Phase 4: Vibe Coding Features (4周)

**目标**: 专业功能

**Week 11-12: Code Evolution**
- [ ] 代码演进追踪
- [ ] 相似代码搜索
- [ ] 变更可视化

**Week 13-14: Decision Tracking**
- [ ] 决策提取
- [ ] 决策链构建
- [ ] ADR生成

**Deliverable**: Vibe Coding完整功能集

### Phase 5: Multi-Platform (3周)

**目标**: 平台扩展

**Week 15: Aider**
- [ ] Markdown解析
- [ ] Git-commit关联

**Week 16: Continue.dev**
- [ ] JSON解析
- [ ] 编辑器集成

**Week 17: Warp/other**
- [ ] 其他终端工具支持

**Deliverable**: 支持主流终端AI工具

### Phase 6: Integration & Polish (3周)

**目标**: 产品化

**Week 18-19: UI/UX**
- [ ] Terminal侧边栏设计
- [ ] 代码高亮查看器
- [ ] 决策树可视化

**Week 20: Integration**
- [ ] 与浏览器对话关联
- [ ] 统一搜索
- [ ] 导出集成

**Deliverable**: 生产就绪版本

---

## 7. 竞品差异化

### 7.1 竞品分析

| 功能 | Claude Code | Aider | VESTI Terminal |
|-----|-------------|-------|----------------|
| 对话历史 | ❌ 无 | ❌ 无 | ✅ 完整捕获 |
| 搜索 | ❌ 无 | ❌ 无 | ✅ 语义搜索 |
| Thinking保存 | ❌ 不保存 | ❌ 无 | ✅ 完整保留 |
| 代码提取 | ❌ 无 | ❌ 无 | ✅ 自动提取 |
| Git关联 | ❌ 无 | ⚠️ 部分 | ✅ 完整关联 |
| 决策追踪 | ❌ 无 | ❌ 无 | ✅ 自动提取 |
| 压缩 | ❌ 无 | ❌ 无 | ✅ PACS压缩 |
| 跨平台 | ❌ 无 | ❌ 无 | ✅ 统一视图 |

### 7.2 独特价值主张

**1. 终端AI的"第二大脑"**
```
其他工具: 用完即走，历史丢失
VESTI:     完整记忆，随时检索
```

**2. Vibe Coding专用优化**
```
理解长会话结构
自动提取代码演进
追踪架构决策链
```

**3. 与现有VESTI生态整合**
```
浏览器AI + 终端AI = 完整的AI编程记忆
统一搜索、统一导出、统一洞察
```

---

## 附录A: 技术参考

### A.1 Claude Code文件格式

```
~/.claude/projects/{project-name}/
├── {session-id}.jsonl          # 完整对话流
└── {session-id}/               # 文件快照
    ├── {hash}@v1               # 文件版本1
    └── {hash}@v2               # 文件版本2
```

### A.2 Aider文件格式

```
~/.aider/chat_history/
└── {timestamp}_{model}.md      # Markdown格式对话
```

### A.3 Continue.dev文件格式

```
~/.continue/sessions/
└── {session-id}.json           # JSON格式会话
```

### A.4 推荐的npm包

```json
{
  "chokidar": "^3.5.3",        // 文件系统监控
  "simple-git": "^3.20.0",     // Git操作
  "globby": "^13.2.2",         // 文件匹配
  "tiktoken": "^1.0.10",       // Token计算
  "minimatch": "^9.0.3"        // 路径匹配
}
```

---

## 附录B: 设计原则

### B.1 终端优先原则

1. **性能优先**: 不拖慢终端操作
2. **本地优先**: 数据不上传云端
3. **异步处理**: 不阻塞用户输入
4. **增量更新**: 只处理变化的部分

### B.2 开发者体验原则

1. **零配置**: 自动检测工具和数据位置
2. **透明运行**: 后台静默工作
3. **快速访问**: 快捷键/命令行快速搜索
4. **可扩展**: 支持新工具的插件化

### B.3 数据完整性原则

1. **不修改原数据**: 只读取不写入终端工具的文件
2. **版本兼容**: 适配不同版本的工具格式
3. **容错处理**: 格式变化时优雅降级
4. **完整保留**: Thinking、Tool calls等元数据完整保存

---

**VESTI Terminal = 终端开发者的AI编程记忆系统**

让每一次Vibe Coding都有迹可循，让每一个架构决策都有据可查。
