# Echo - Vibe Coding Memory System
## 全终端AI对话记忆管理平台设计规范 v3.0

**代号**: Echo  
**标语**: *"Your AI conversations, echoing forever"*  
**核心定位**: 全量Vibe Coding Agent对话记忆管理、压缩、迁移、复用平台  
**日期**: 2026年3月

---

## 目录

1. [产品定义](#1-产品定义)
2. [核心功能架构](#2-核心功能架构)
3. [详细功能设计](#3-详细功能设计)
4. [技术实现方案](#4-技术实现方案)
5. [UI/UX设计](#5-uiux设计)
6. [Roadmap](#6-roadmap)

---

## 1. 产品定义

### 1.1 产品愿景

> Echo是Vibe Coding时代的**记忆基础设施**。
> 
> 它让开发者在Claude Code、Aider、Cursor、Continue.dev等终端AI工具中的每一次对话都被完整记录、智能压缩、便捷复用。让AI编程的知识不再随会话结束而消失，而是形成可搜索、可迁移、可进化的个人知识资产。

### 1.2 核心能力矩阵

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Echo Core Capabilities                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CAPTURE          COMPRESS           MIGRATE            REUSE              │
│   ───────          ────────           ───────            ─────              │
│                                                                             │
│   ┌───────┐       ┌────────┐         ┌────────┐        ┌────────┐         │
│   │ 全量  │──────▶│ 智能   │────────▶│ 跨项目 │───────▶│ 代码   │         │
│   │ 捕获  │       │ 压缩   │         │ 迁移   │        │ 复用   │         │
│   └───────┘       └────────┘         └────────┘        └────────┘         │
│                                                                             │
│   ┌───────┐       ┌────────┐         ┌────────┐        ┌────────┐         │
│   │ 实时  │       │ 多级   │         │ 上下文 │        │ 知识   │         │
│   │ 监听  │       │ 摘要   │         │ 注入   │        │ 包   │         │
│   └───────┘       └────────┘         └────────┘        └────────┘         │
│                                                                             │
│   ┌───────┐       ┌────────┐         ┌────────┐        ┌────────┐         │
│   │ 多    │       │ 导出   │         │ 多对话 │        │ 模式   │         │
│   │ 平台  │       │ 归档   │         │ 总结   │        │ 识别   │         │
│   └───────┘       └────────┘         └────────┘        └────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 支持的Agent平台

| 平台 | 支持状态 | 数据位置 | 特殊功能 |
|-----|---------|---------|---------|
| **Claude Code** | ✅ 完整支持 | `~/.claude/` | Thinking提取、Tool calls |
| **Aider** | ✅ 完整支持 | `~/.aider/` | Git集成、Edit block追踪 |
| **Cursor** | ✅ 完整支持 | `~/.cursor/` | Composer会话、Tab历史 |
| **Continue.dev** | ✅ 完整支持 | `~/.continue/` | 多模型支持 |
| **GitHub Copilot Chat** | 🟡 开发中 | VS Code内部 | 需要插件配合 |
| **Warp** | 🟡 计划中 | `~/.warp/` | 终端AI特性 |
| **Zed AI** | 🟡 计划中 | `~/.zed/` | 协作编辑 |

---

## 2. 核心功能架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Echo System Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        User Interface Layer                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │  │   Browser    │  │   CLI/TUI    │  │   VS Code    │                │ │
│  │  │   Extension  │  │   Interface  │  │   Extension  │                │ │
│  │  │  (Primary)   │  │  (Advanced)  │  │   (Optional) │                │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  │                                                                        │ │
│  │  WebSocket/HTTP API: ws://localhost:7777                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Echo Core Engine                                │ │
│  │                                                                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │   Agent     │ │   Memory    │ │Compression │ │   Context   │     │ │
│  │  │   Adapters  │ │   Indexer   │ │   Engine   │ │   Bridge    │     │ │
│  │  │             │ │             │ │            │ │             │     │ │
│  │  │ • Claude    │ │ • Vector    │ │ • Tier 1-3 │ │ • Export   │     │ │
│  │  │ • Aider     │ │   Store     │ │ • Decision │ │ • Import   │     │ │
│  │  │ • Cursor    │ │ • Graph     │ │   Extract │ │ • Migrate  │     │ │
│  │  │ • Continue  │ │   DB        │ │ • Summary  │ │ • Inject   │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  │                                                                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │   Code      │ │   Pattern   │ │   Export    │ │    RAG      │     │ │
│  │  │   Library   │ │Recognition  │ │   Engine    │ │   Engine    │     │ │
│  │  │             │ │             │ │             │ │             │     │ │
│  │  │ • Snippets  │ │ • Coding    │ │ • Markdown │ │ • Semantic │     │ │
│  │  │ • Templates │ │   DNA       │ │ • JSON     │ │ • Hybrid   │     │ │
│  │  │ • Recommender│ │ • Trends   │ │ • Code Pack│ │ • Multi-turn│    │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Storage Layer                                   │ │
│  │                                                                        │ │
│  │  SQLite (~/.echo/data.db)              File System                     │ │
│  │  ├── conversations                     ~/.echo/snapshots/             │ │
│  │  ├── messages                          └── file_snapshots/            │ │
│  │  ├── code_snippets                                                    │ │
│  │  ├── decisions                                                        │ │
│  │  ├── embeddings (Vector)                                              │ │
│  │  └── context_packs                                                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Agent Platforms                                 │ │
│  │                                                                        │ │
│  │  ~/.claude/     ~/.aider/      ~/.cursor/      ~/.continue/           │ │
│  │  └──projects/   └──history/    └──composer/    └──sessions/           │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据模型

```typescript
// 核心数据模型定义

// ==================== 会话 (Conversation) ====================
interface EchoConversation {
  id: string;                    // UUID
  echoId: string;                // Echo系统ID (echo_xxx)
  
  // 来源信息
  source: {
    platform: 'claude-code' | 'aider' | 'cursor' | 'continue-dev';
    sessionId: string;           // 原始平台会话ID
    projectPath: string;         // 工作目录
    branch?: string;             // Git分支
    commit?: string;             // Git提交
  };
  
  // 时间
  timeline: {
    startedAt: number;
    endedAt?: number;
    lastActivityAt: number;
    duration: number;            // 毫秒
  };
  
  // 统计
  stats: {
    messageCount: number;
    userMessages: number;
    aiMessages: number;
    thinkingTokens: number;      // AI思考过程token数
    toolCalls: number;
    codeBlocks: number;
    filesAccessed: string[];
    filesModified: string[];
  };
  
  // 元数据
  metadata: {
    title: string;
    description?: string;
    tags: string[];
    isArchived: boolean;
    isFavorite: boolean;
  };
  
  // 压缩数据 (多级缓存)
  compression: {
    semantic?: CompressedView;   // 60-80%压缩
    hierarchical?: CompressedView; // 15-25%压缩
    knowledge?: CompressedView;  // 3-8%压缩
  };
  
  createdAt: number;
  updatedAt: number;
}

// ==================== 消息 (Message) ====================
interface EchoMessage {
  id: string;
  echoId: string;
  conversationId: string;
  
  // 基础信息
  role: 'user' | 'assistant' | 'system';
  type: 'message' | 'thinking' | 'tool_use' | 'tool_result' | 'progress';
  
  // 内容 (根据类型不同)
  content: {
    text?: string;               // 主要文本
    thinking?: string;           // Claude thinking
    toolName?: string;           // 工具名
    toolInput?: any;             // 工具输入
    toolOutput?: any;            // 工具输出
    codeBlocks?: CodeBlock[];    // 提取的代码
  };
  
  // 关系
  parentId?: string;             // 父消息ID (树形结构)
  childrenIds: string[];         // 子消息ID
  
  // 上下文
  context: {
    cwd?: string;
    timestamp: number;
    fileContext?: string[];      // 当前打开的文件
  };
  
  // 衍生数据
  extracted: {
    decisions?: Decision[];      // 提取的决策
    codeSnippets?: string[];     // 关联的代码片段ID
    entities?: string[];         // 识别的实体
  };
}

// ==================== 代码片段 (Code Snippet) ====================
interface EchoCodeSnippet {
  id: string;
  echoId: string;
  
  // 代码内容
  code: string;
  language: string;
  
  // 来源
  source: {
    conversationId: string;
    messageId: string;
    platform: string;
    extractedAt: number;
  };
  
  // 元数据
  metadata: {
    title?: string;
    description?: string;
    filePath?: string;           // 原始文件路径
    lines?: [number, number];    // 行号范围
    tags: string[];
  };
  
  // 使用追踪
  usage: {
    copyCount: number;
    appliedCount: number;        // 应用到项目的次数
    lastUsedAt?: number;
    appliedTo: string[];         // 应用到的项目路径
  };
  
  // 用于搜索和推荐
  embedding: Float32Array;
  astHash?: string;              // AST指纹
  
  // 关联
  relatedSnippets: string[];     // 相关代码片段ID
  evolvedFrom?: string;          // 演化来源
  evolvedTo?: string[];          // 演化去向
}

// ==================== 上下文包 (Context Pack) ====================
interface EchoContextPack {
  id: string;
  echoId: string;
  
  // 来源
  source: {
    conversationIds: string[];   // 来源会话
    extractedAt: number;
    version: string;
  };
  
  // 内容
  content: {
    summary: string;             // 人工可读的总结
    decisions: Decision[];       // 关键决策
    codeSnippets: string[];      // 代码片段ID列表
    qaPairs: QAPair[];           // 问答对
    fileReferences: string[];    // 文件引用
  };
  
  // 元数据
  metadata: {
    name: string;
    description: string;
    tags: string[];
    category: 'architecture' | 'implementation' | 'bugfix' | 'optimization' | 'other';
    projectPath?: string;        // 来源项目
  };
  
  // 使用
  usage: {
    importCount: number;
    lastImportedAt?: number;
    importedTo: string[];
  };
  
  embedding: Float32Array;
  createdAt: number;
}

// ==================== 迁移记录 (Migration) ====================
interface EchoMigration {
  id: string;
  type: 'export' | 'import' | 'inject';
  
  source: {
    type: 'local' | 'pack' | 'session';
    id: string;
    projectPath?: string;
  };
  
  target: {
    type: 'claude-code' | 'aider' | 'cursor' | 'file';
    id: string;
    projectPath?: string;
  };
  
  content: {
    conversationIds?: string[];
    packId?: string;
    summaryLength: 'brief' | 'standard' | 'detailed' | 'full';
    includedThinking: boolean;
    includedCode: boolean;
  };
  
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: {
    success: boolean;
    message?: string;
    outputPath?: string;
  };
  
  createdAt: number;
  completedAt?: number;
}
```

---

## 3. 详细功能设计

### 3.1 全量Agent记忆管理

#### 3.1.1 统一Agent适配器架构

```typescript
// 所有Agent的通用接口
interface AgentAdapter {
  readonly name: string;
  readonly version: string;
  
  // 检测
  detect(): Promise<boolean>;
  getInstallPath(): string | null;
  
  // 监控
  watch(): Promise<void>;
  unwatch(): Promise<void>;
  
  // 解析
  parseIncremental(filePath: string, position: number): Promise<ParseResult>;
  parseFull(filePath: string): Promise<ParseResult>;
  
  // 特定功能
  extractThinking?(message: any): string | null;
  extractToolCalls?(message: any): ToolCall[];
  extractCodeBlocks?(content: string): CodeBlock[];
  
  // 注入 (将Echo内容写回Agent)
  injectContext?(target: string, context: ContextPack): Promise<InjectResult>;
}

// Claude Code适配器
class ClaudeCodeAdapter implements AgentAdapter {
  name = 'Claude Code';
  version = '2.x';
  
  watchPaths = [
    '~/.claude/projects/**/*.jsonl',
    '~/.claude/history.jsonl'
  ];
  
  async parseIncremental(filePath: string, position: number): Promise<ParseResult> {
    // 1. 读取新增内容
    const newContent = await readFileFromPosition(filePath, position);
    
    // 2. 按行解析JSONL
    const lines = newContent.trim().split('\n');
    const messages: Partial<EchoMessage>[] = [];
    
    for (const line of lines) {
      const raw = JSON.parse(line);
      
      // 3. 转换为Echo格式
      messages.push({
        role: this.mapRole(raw.type),
        type: this.mapType(raw),
        content: {
          text: this.extractText(raw),
          thinking: this.extractThinking(raw),
          toolName: raw.message?.tool_use?.name,
          toolInput: raw.message?.tool_use?.input,
          codeBlocks: this.extractCodeBlocks(raw)
        },
        parentId: raw.parentUuid,
        context: {
          cwd: raw.cwd,
          timestamp: new Date(raw.timestamp).getTime()
        }
      });
    }
    
    return { messages, newPosition: position + newContent.length };
  }
  
  // 向Claude Code注入上下文
  async injectContext(targetSession: string, pack: ContextPack): Promise<InjectResult> {
    // 方案1: 通过API (如果Claude Code提供)
    // 方案2: 写入特定文件，Claude Code插件读取
    // 方案3: 模拟粘贴到终端
    
    const injectPath = path.join('~/.claude/contexts', `${pack.echoId}.md`);
    await writeFile(injectPath, this.formatForClaude(pack));
    
    return {
      success: true,
      message: `Context written to ${injectPath}. Use "/context load ${pack.echoId}" in Claude Code.`
    };
  }
  
  private formatForClaude(pack: ContextPack): string {
    return `# Echo Context: ${pack.metadata.name}

## Summary
${pack.content.summary}

## Key Decisions
${pack.content.decisions.map(d => `- **${d.title}**: ${d.description}`).join('\n')}

## Code Snippets
${pack.content.codeSnippets.map(id => `<!-- snippet:${id} -->`).join('\n')}

## How to Use This Context
This context was migrated from previous conversations. 
Refer to the decisions above when making similar choices.
`;
  }
}

// Aider适配器
class AiderAdapter implements AgentAdapter {
  name = 'Aider';
  version = '1.x';
  
  watchPaths = [
    '~/.aider/chat.history.md',
    '.aider.chat.history.md'
  ];
  
  async parseIncremental(filePath: string, position: number): Promise<ParseResult> {
    // Aider使用Markdown格式，需要特殊解析
    const content = await readFileFromPosition(filePath, position);
    
    // 解析Markdown结构
    // #### You: / #### Assistant: 格式
    const messages = this.parseMarkdownChat(content);
    
    return { messages, newPosition: position + content.length };
  }
  
  // Aider特有: 提取Git提交信息
  extractGitCommits(content: string): GitCommit[] {
    const commitPattern = /```commit\n([\s\S]*?)```/g;
    // ...
  }
}

// Cursor适配器
class CursorAdapter implements AgentAdapter {
  name = 'Cursor';
  version = '1.x';
  
  watchPaths = [
    '~/.cursor/composer/*/state.json',
    '~/.cursor/tabs/*/chat.json'
  ];
  
  // Cursor特有: Composer会话解析
  async parseComposerState(statePath: string): Promise<ComposerSession> {
    // 解析Cursor的Composer状态文件
  }
}
```

#### 3.1.2 实时监控引擎

```typescript
class EchoWatchEngine {
  private watchers: Map<string, FSWatcher> = new Map();
  private adapters: Map<string, AgentAdapter> = new Map();
  private filePositions: Map<string, number> = new Map();
  
  async initialize(): Promise<void> {
    // 注册所有适配器
    this.registerAdapter(new ClaudeCodeAdapter());
    this.registerAdapter(new AiderAdapter());
    this.registerAdapter(new CursorAdapter());
    this.registerAdapter(new ContinueDevAdapter());
    
    // 启动监控
    for (const [name, adapter] of this.adapters) {
      if (await adapter.detect()) {
        console.log(`[Echo] Detected ${name}, starting watch...`);
        await this.startWatching(adapter);
      }
    }
  }
  
  private async startWatching(adapter: AgentAdapter): Promise<void> {
    const watcher = chokidar.watch(adapter.watchPaths, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });
    
    watcher.on('change', async (filePath) => {
      const lastPosition = this.filePositions.get(filePath) || 0;
      const result = await adapter.parseIncremental(filePath, lastPosition);
      
      if (result.messages.length > 0) {
        // 存储到数据库
        await this.storeMessages(adapter.name, result.messages);
        
        // 实时推送到UI
        this.broadcast({
          type: 'NEW_MESSAGES',
          platform: adapter.name,
          count: result.messages.length,
          preview: result.messages[0].content?.text?.slice(0, 100)
        });
      }
      
      this.filePositions.set(filePath, result.newPosition);
    });
    
    this.watchers.set(adapter.name, watcher);
  }
  
  // 后台任务：历史会话导入
  async importHistoricalSessions(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      // 扫描历史文件，导入到Echo
      const historyFiles = await glob(adapter.watchPaths);
      
      for (const file of historyFiles) {
        const exists = await this.checkIfImported(file);
        if (!exists) {
          const result = await adapter.parseFull(file);
          await this.storeConversation(adapter.name, result);
        }
      }
    }
  }
}
```

### 3.2 便捷压缩导出

#### 3.2.1 多级压缩系统

```typescript
interface CompressionLevel {
  name: string;
  ratio: string;      // 如 "85%"
  tokenCount: number; // 预估token数
  description: string;
}

const COMPRESSION_LEVELS: CompressionLevel[] = [
  {
    name: 'essence',
    ratio: '97%',
    tokenCount: 500,
    description: '一句话总结 + 关键决策'
  },
  {
    name: 'brief',
    ratio: '90%',
    tokenCount: 2000,
    description: '核心要点 + 关键代码'
  },
  {
    name: 'standard',
    ratio: '70%',
    tokenCount: 8000,
    description: '完整摘要 + 主要代码 + 决策理由'
  },
  {
    name: 'detailed',
    ratio: '40%',
    tokenCount: 25000,
    description: '详细过程 + 全部代码 + Thinking摘要'
  },
  {
    name: 'full',
    ratio: '0%',
    tokenCount: 0, // 原始大小
    description: '完整对话，无压缩'
  }
];

class EchoCompressionEngine {
  // 智能级别推荐
  async recommendLevel(conversation: EchoConversation): Promise<CompressionLevel> {
    const factors = {
      messageCount: conversation.stats.messageCount,
      hasImportantDecisions: await this.hasImportantDecisions(conversation.id),
      hasCode: conversation.stats.codeBlocks > 0,
      userPreference: await this.getUserPreference(conversation.source.platform)
    };
    
    if (factors.messageCount < 20) return COMPRESSION_LEVELS[1]; // brief
    if (factors.hasImportantDecisions) return COMPRESSION_LEVELS[2]; // standard
    if (factors.messageCount > 100) return COMPRESSION_LEVELS[1]; // brief
    
    return COMPRESSION_LEVELS[2]; // default to standard
  }
  
  // 执行压缩
  async compress(
    conversation: EchoConversation,
    level: CompressionLevel
  ): Promise<CompressedConversation> {
    switch (level.name) {
      case 'essence':
        return this.compressToEssence(conversation);
      case 'brief':
        return this.compressToBrief(conversation);
      case 'standard':
        return this.compressToStandard(conversation);
      case 'detailed':
        return this.compressToDetailed(conversation);
      case 'full':
        return this.compressToFull(conversation);
      default:
        throw new Error(`Unknown compression level: ${level.name}`);
    }
  }
  
  private async compressToStandard(conv: EchoConversation): Promise<CompressedConversation> {
    const messages = await this.getMessages(conv.id);
    
    // 1. 提取关键决策
    const decisions = await this.extractDecisions(messages);
    
    // 2. 提取关键代码
    const codeSnippets = await this.extractKeyCode(messages);
    
    // 3. 生成对话摘要
    const summary = await this.generateSummary(messages, {
      maxLength: 2000,
      includeDecisions: true,
      includeCode: true
    });
    
    // 4. 构建压缩视图
    return {
      level: 'standard',
      summary,
      decisions: decisions.slice(0, 10), // Top 10 decisions
      codeSnippets: codeSnippets.slice(0, 20), // Top 20 snippets
      messageHighlights: this.extractHighlights(messages),
      stats: {
        originalMessageCount: messages.length,
        compressedMessageCount: 0, // 不保留完整消息
        compressionRatio: '70%'
      }
    };
  }
  
  // 导出为各种格式
  async export(
    conversation: EchoConversation,
    format: 'markdown' | 'json' | 'html' | 'pdf',
    level: CompressionLevel
  ): Promise<ExportResult> {
    const compressed = await this.compress(conversation, level);
    
    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(compressed, conversation);
      case 'json':
        return this.exportToJSON(compressed, conversation);
      case 'html':
        return this.exportToHTML(compressed, conversation);
      case 'pdf':
        return this.exportToPDF(compressed, conversation);
    }
  }
  
  private async exportToMarkdown(
    compressed: CompressedConversation,
    original: EchoConversation
  ): Promise<ExportResult> {
    const content = `# ${original.metadata.title}

## Metadata
- **Platform**: ${original.source.platform}
- **Project**: ${original.source.projectPath}
- **Duration**: ${this.formatDuration(original.timeline.duration)}
- **Messages**: ${original.stats.messageCount}
- **Compression**: ${compressed.level} (${compressed.stats.compressionRatio})

## Summary
${compressed.summary}

## Key Decisions
${compressed.decisions.map((d, i) => `
### ${i + 1}. ${d.title}
**Decision**: ${d.decision}
**Rationale**: ${d.rationale}
**Impact**: ${d.impact}
`).join('\n')}

## Code Snippets
${compressed.codeSnippets.map(s => `
### ${s.title || 'Code Block'}
\`\`\`${s.language}
${s.code}
\`\`\`
*From: ${s.source.filePath || 'Generated'}*
`).join('\n')}

## How to Use This Export
This document was generated by [Echo](https://echo.dev) - Your Vibe Coding memory system.
Import this into Claude Code using: \`/context load ${original.echoId}\`
`;

    return {
      content,
      filename: `${original.echoId}_${compressed.level}.md`,
      mimeType: 'text/markdown'
    };
  }
}
```

#### 3.2.2 一键导出界面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📤 Export Conversation                                                      │
│  🔷 Database Migration Optimization (156 messages)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Select Compression Level                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  ( ) Essence  - 97% compression (~500 tokens)                         │ │
│  │      "一句话总结 + 关键决策"                                           │ │
│  │                                                                       │ │
│  │  ( ) Brief    - 90% compression (~2,000 tokens)                       │ │
│  │      "核心要点 + 关键代码"                                             │ │
│  │                                                                       │ │
│  │  (●) Standard - 70% compression (~8,000 tokens)  ◀── 推荐             │ │
│  │      "完整摘要 + 主要代码 + 决策理由"                                   │ │
│  │                                                                       │ │
│  │  ( ) Detailed - 40% compression (~25,000 tokens)                      │ │
│  │      "详细过程 + 全部代码 + Thinking摘要"                              │ │
│  │                                                                       │ │
│  │  ( ) Full     - 0% compression (156 messages, ~50k tokens)            │ │
│  │      "完整对话，无压缩"                                                │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Step 2: Select Export Format                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  [●] Markdown (.md)     适合阅读和分享                                │ │
│  │  [ ] JSON (.json)       完整数据结构，适合导入                         │ │
│  │  [ ] HTML (.html)       可交互的网页格式                               │ │
│  │  [ ] PDF (.pdf)         适合打印和归档                                 │ │
│  │  [ ] Code Pack (.zip)   仅导出代码文件                                 │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Step 3: Additional Options                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ☑️ Include thinking process                                           │ │
│  │ ☑️ Include tool call results                                          │ │
│  │ ☑️ Include file snapshots                                             │ │
│  │ ☐  Include git diff (if available)                                    │ │
│  │ ☐  Password protect (PDF only)                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Preview:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 Export will be ~45KB Markdown file                                 │ │
│  │    Estimated reading time: 15 minutes                                 │ │
│  │    Contains: 8 decisions, 12 code snippets                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [📋 Copy to Clipboard]  [💾 Save to File]  [📤 Share]                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 迁移系统

#### 3.3.1 多维度迁移

```typescript
// 迁移类型定义
type MigrationType = 
  | 'session-to-session'      // 会话到新会话
  | 'session-to-pack'         // 会话到知识包
  | 'pack-to-session'         // 知识包到会话
  | 'pack-to-pack'            // 知识包合并
  | 'project-to-project'      // 项目到项目
  | 'export-to-file'          // 导出到文件
  | 'import-from-file';       // 从文件导入

interface MigrationEngine {
  // 会话迁移：将旧会话上下文注入新会话
  async migrateSessionToSession(
    sourceSessionId: string,
    targetAgent: 'claude-code' | 'aider' | 'cursor',
    options: MigrationOptions
  ): Promise<MigrationResult>;
  
  // 知识包迁移：将多个会话打包为可复用知识
  async migrateSessionsToPack(
    sourceSessionIds: string[],
    packMetadata: PackMetadata
  ): Promise<ContextPack>;
  
  // 知识包注入：将知识包注入Agent会话
  async migratePackToSession(
    packId: string,
    targetSessionId: string,
    injectionMode: 'prepend' | 'append' | 'summary'
  ): Promise<InjectionResult>;
  
  // 项目迁移：将项目A的知识迁移到项目B
  async migrateProjectToProject(
    sourceProject: string,
    targetProject: string,
    filter: ProjectMigrationFilter
  ): Promise<ProjectMigrationResult>;
}

// 具体实现
class EchoMigrationEngine implements MigrationEngine {
  async migrateSessionToSession(
    sourceId: string,
    targetAgent: string,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    // 1. 获取源会话
    const source = await this.getConversation(sourceId);
    
    // 2. 生成压缩摘要
    const compressor = new EchoCompressionEngine();
    const compressed = await compressor.compress(source, options.level);
    
    // 3. 格式化目标Agent可接受的格式
    const adapter = this.getAdapter(targetAgent);
    const formatted = adapter.formatForInjection(compressed, options);
    
    // 4. 执行注入
    const injectResult = await adapter.injectContext(formatted);
    
    // 5. 记录迁移历史
    await this.recordMigration({
      type: 'session-to-session',
      source: { type: 'session', id: sourceId },
      target: { type: targetAgent, id: injectResult.sessionId },
      status: injectResult.success ? 'completed' : 'failed'
    });
    
    return {
      success: injectResult.success,
      targetSessionId: injectResult.sessionId,
      preview: compressed.summary,
      message: injectResult.message
    };
  }
  
  async migrateSessionsToPack(
    sessionIds: string[],
    metadata: PackMetadata
  ): Promise<ContextPack> {
    // 1. 获取所有会话
    const sessions = await Promise.all(
      sessionIds.map(id => this.getConversation(id))
    );
    
    // 2. 提取和合并知识
    const extractor = new KnowledgeExtractor();
    const knowledge = await extractor.extractFromSessions(sessions);
    
    // 3. 生成Embedding
    const embedder = new EmbeddingGenerator();
    const embedding = await embedder.generate(knowledge.summary);
    
    // 4. 创建知识包
    const pack: ContextPack = {
      id: generateUUID(),
      echoId: `pack_${generateShortId()}`,
      source: {
        conversationIds: sessionIds,
        extractedAt: Date.now(),
        version: '1.0'
      },
      content: {
        summary: knowledge.summary,
        decisions: knowledge.decisions,
        codeSnippets: knowledge.codeSnippets.map(s => s.id),
        qaPairs: knowledge.qaPairs,
        fileReferences: knowledge.fileReferences
      },
      metadata: {
        name: metadata.name,
        description: metadata.description,
        tags: metadata.tags,
        category: metadata.category,
        projectPath: sessions[0]?.source.projectPath
      },
      usage: {
        importCount: 0,
        importedTo: []
      },
      embedding,
      createdAt: Date.now()
    };
    
    // 5. 存储
    await this.storePack(pack);
    
    return pack;
  }
}
```

#### 3.3.2 迁移界面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔄 Echo Migration Center                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Migration Type:                                                            │
│  ┌────────────┬────────────┬────────────┬────────────┐                     │
│  │ 📝 Session │ 📦 Pack    │ 🔄 Project │ 📤 Export  │                     │
│  │    to      │   to       │    to      │   to       │                     │
│  │  Session   │  Session   │  Project   │   File     │                     │
│  └────────────┴────────────┴────────────┴────────────┘                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Selected: 📝 Session to Session                                            │
│                                                                             │
│  Step 1: Select Source Session                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Search sessions...                                                 │ │
│  │                                                                       │ │
│  │ Recent Sessions:                                                      │ │
│  │ ● 🔷 Database Migration (Claude Code, 156 msg, 2 days ago)           │ │
│  │ ○ 🔷 API Auth Refactor (Claude Code, 89 msg, 3 days ago)             │ │
│  │ ○ 🔧 Rate Limiter (Aider, 45 msg, 5 days ago)                        │ │
│  │                                                                       │ │
│  │ ○ Show more...                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Step 2: Select Target Agent & Project                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Target Agent:                                                         │ │
│  │ (●) Claude Code    (Active in /home/user/new-project)                │ │
│  │ ( ) Aider          (Not running)                                      │ │
│  │ ( ) Cursor         (Not running)                                      │ │
│  │                                                                       │ │
│  │ Target Session:                                                       │ │
│  │ (●) Current active session                                            │ │
│  │ ( ) New session                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Step 3: Configure Migration                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Content to Migrate:                                                   │ │
│  │ ☑️ Session summary (auto-generated)                                   │ │
│  │ ☑️ Key decisions (8 found)                                            │ │
│  │ ☑️ Code snippets (12 found)                                           │ │
│  │ ☑️ Q&A pairs (5 found)                                                │ │
│  │ ☐  Full message history (156 messages, ~50k tokens)                   │ │
│  │                                                                       │ │
│  │ Compression Level:                                                    │ │
│  │ [Standard ▼] (Recommended for context injection)                      │ │
│  │                                                                       │ │
│  │ Injection Mode:                                                       │ │
│  │ (●) Prepend to conversation (as system context)                       │ │
│  │ ( ) Append as user message                                            │ │
│  │ ( ) Inject as tool result                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Preview:                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 Will inject ~8,000 tokens into new Claude Code session             │ │
│  │    Estimated context usage: 20%                                       │ │
│  │    Contains: 8 decisions, 12 code snippets, 5 Q&A pairs               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [Preview]  [🚀 Execute Migration]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 多对话总结迁移

#### 3.4.1 跨会话知识融合

```typescript
class MultiConversationSummarizer {
  // 将多个相关会话总结为统一知识视图
  async summarizeMultiple(
    conversationIds: string[],
    goal: 'architecture' | 'implementation' | 'learning' | 'troubleshooting'
  ): Promise<MultiConversationSummary> {
    // 1. 获取所有会话
    const conversations = await Promise.all(
      conversationIds.map(id => this.getConversationWithMessages(id))
    );
    
    // 2. 时序排序
    const sorted = conversations.sort(
      (a, b) => a.timeline.startedAt - b.timeline.startedAt
    );
    
    // 3. 提取时间线主题
    const timeline = await this.extractTimeline(sorted);
    
    // 4. 识别知识演进
    const evolution = await this.analyzeEvolution(sorted);
    
    // 5. 合并决策（去重+关联）
    const decisions = await this.mergeDecisions(sorted);
    
    // 6. 构建知识图谱
    const knowledgeGraph = await this.buildKnowledgeGraph(sorted);
    
    // 7. 生成综合摘要
    const summary = await this.generateComprehensiveSummary({
      timeline,
      evolution,
      decisions,
      knowledgeGraph,
      goal
    });
    
    return {
      id: generateUUID(),
      title: this.generateTitle(sorted, goal),
      summary,
      timeline,
      evolution,
      decisions,
      knowledgeGraph,
      sourceConversations: conversationIds,
      createdAt: Date.now()
    };
  }
  
  private async extractTimeline(
    conversations: EchoConversation[]
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    
    for (const conv of conversations) {
      // 提取每个会话的关键节点
      const messages = await this.getMessages(conv.id);
      const milestones = this.identifyMilestones(messages);
      
      events.push({
        timestamp: conv.timeline.startedAt,
        type: 'session_start',
        title: conv.metadata.title,
        description: conv.metadata.description,
        conversationId: conv.id
      });
      
      for (const milestone of milestones) {
        events.push({
          timestamp: milestone.timestamp,
          type: milestone.type, // 'decision' | 'breakthrough' | 'implementation'
          title: milestone.title,
          description: milestone.description,
          conversationId: conv.id,
          messageId: milestone.messageId
        });
      }
    }
    
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private async analyzeEvolution(
    conversations: EchoConversation[]
  ): Promise<EvolutionAnalysis> {
    // 分析代码演进
    const codeEvolution = await this.trackCodeEvolution(conversations);
    
    // 分析决策演进
    const decisionEvolution = await this.trackDecisionEvolution(conversations);
    
    // 分析认知演进
    const understandingEvolution = await this.trackUnderstandingEvolution(conversations);
    
    return {
      codeEvolution,
      decisionEvolution,
      understandingEvolution,
      keyTransitions: this.identifyKeyTransitions(
        codeEvolution,
        decisionEvolution,
        understandingEvolution
      )
    };
  }
}
```

#### 3.4.2 多对话总结界面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📚 Multi-Conversation Summary                                               │
│  Topic: API v2.0 Architecture & Implementation                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 Overview                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Source: 5 conversations over 14 days                                    │ │
│  │ Total: 687 messages, 47 decisions, 32 code files                      │ │
│  │ Platforms: Claude Code (3), Aider (2)                                 │ │
│  │ Status: ✅ Completed                                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  📈 Evolution Timeline                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │ Mar 1  ━━●━━ Architecture Design                                      │ │
│  │          "Decided on microservices + GraphQL"                         │ │
│  │            │                                                          │ │
│  │ Mar 3  ━━●━━ Database Schema                                          │ │
│  │          "Migrated from monolith to sharded DB"                       │ │
│  │            │                                                          │ │
│  │ Mar 5  ━━●━━ Authentication Layer                                     │ │
│  │          "Implemented JWT + RBAC"                                     │ │
│  │            │                                                          │ │
│  │ Mar 8  ━━●━━ API Gateway                                              │ │
│  │          "Rate limiting + caching"                                    │ │
│  │            │                                                          │ │
│  │ Mar 10 ━━●━━ Testing & Deployment                                     │ │
│  │          "CI/CD + integration tests"                                  │ │
│  │                                                                       │ │
│  │ [📊 View detailed timeline]  [🎬 Replay evolution]                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🎯 Key Decisions (47 total, 12 critical)                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 1. ✅ Adopt microservices architecture (Mar 1)                        │ │
│  │    └─ Evolved from: Monolith with service modules                     │ │
│  │       └─ Reason: Scalability requirements                             │ │
│  │                                                                         │ │
│  │ 2. ✅ Use GraphQL over REST (Mar 1)                                   │ │
│  │    └─ Overruled: Initial REST proposal                                │ │
│  │       └─ Reason: Frontend flexibility + type safety                   │ │
│  │                                                                         │ │
│  │ 3. ✅ PostgreSQL with Citus for sharding (Mar 3)                      │ │
│  │    └─ Overruled: MongoDB for flexibility                              │ │
│  │       └─ Reason: ACID requirements + team expertise                   │ │
│  │                                                                         │ │
│  │ [View all 47 decisions]  [📄 Export ADR]                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  📦 Generated Assets                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📁 architecture/                                                      │ │
│  │   ├── system-diagram.mermaid                                          │ │
│  │   └── api-contracts.graphql                                           │ │
│  │ 📁 implementation/                                                    │ │
│  │   ├── auth-service/ (12 files)                                        │ │
│  │   ├── gateway-service/ (8 files)                                      │ │
│  │   └── database-migrations/ (15 files)                                 │ │
│  │ 📁 documentation/                                                     │ │
│  │   ├── architecture-decision-records.md                                │ │
│  │   ├── api-documentation.md                                            │ │
│  │   └── deployment-guide.md                                             │ │
│  │                                                                      │ │
│  │ [📥 Download All]  [🔗 Open in Editor]  [📤 Share]                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🧠 Knowledge Graph (Interactive)                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ [Visual graph showing relationships between decisions, code, and     │ │
│  │  concepts. Nodes are clickable for details.]                          │ │
│  │                                                                      │ │
│  │  Auth Service ───┬─── JWT ───┬─── User API                           │ │
│  │                  │           │                                       │ │
│  │  Gateway ────────┴─── Rate Limiting                                 │ │
│  │       │                                                             │ │
│  │  Database ─── Sharding ─── PostgreSQL + Citus                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Actions:                                                                   │
│  [📦 Create Knowledge Pack]  [🚀 Migrate to New Project]  [📤 Share]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 上下文快速注入

#### 3.5.1 智能注入引擎

```typescript
interface ContextInjectionEngine {
  // 快速注入：一键将知识注入当前会话
  async quickInject(
    source: InjectionSource,
    target: InjectionTarget,
    mode: InjectionMode
  ): Promise<InjectionResult>;
  
  // 智能片段：根据当前编辑内容推荐注入
  async smartSnippetInject(
    currentFile: string,
    cursorPosition: Position,
    availableContexts: ContextPack[]
  ): Promise<SnippetRecommendation[]>;
  
  // 自动上下文：基于项目状态自动建议
  async autoContextSuggestion(
    projectPath: string,
    recentActivity: ActivityLog
  ): Promise<ContextSuggestion[]>;
}

// 注入模式
enum InjectionMode {
  SUMMARY = 'summary',           // 仅注入摘要
  DECISIONS = 'decisions',       // 注入决策+理由
  CODE = 'code',                 // 注入相关代码
  FULL = 'full',                 // 注入完整上下文
  ADAPTIVE = 'adaptive'          // 根据目标Agent自适应
}

class EchoInjectionEngine implements ContextInjectionEngine {
  async quickInject(
    source: InjectionSource,
    target: InjectionTarget,
    mode: InjectionMode
  ): Promise<InjectionResult> {
    // 1. 获取源内容
    const content = await this.resolveSource(source);
    
    // 2. 根据模式准备内容
    const prepared = await this.prepareForMode(content, mode);
    
    // 3. 根据目标Agent优化格式
    const adapter = this.getAdapter(target.platform);
    const optimized = await adapter.optimizeForInjection(prepared, {
      maxTokens: target.maxContextSize * 0.3, // 使用30%上下文
      priority: ['decisions', 'code', 'summary'],
      format: target.preferredFormat
    });
    
    // 4. 执行注入
    const result = await adapter.inject(optimized, target);
    
    // 5. 通知用户
    this.notifyUser({
      type: 'injection_complete',
      tokensUsed: optimized.tokenCount,
      contextRemaining: target.maxContextSize - optimized.tokenCount,
      preview: optimized.preview
    });
    
    return result;
  }
  
  async smartSnippetInject(
    currentFile: string,
    cursorPosition: Position,
    availableContexts: ContextPack[]
  ): Promise<SnippetRecommendation[]> {
    // 1. 分析当前文件上下文
    const fileContext = await this.analyzeFileContext(currentFile, cursorPosition);
    
    // 2. 搜索相关代码片段
    const searchResults = await this.searchCodeSnippets({
      query: fileContext.currentFunction || fileContext.imports,
      language: fileContext.language,
      limit: 10
    });
    
    // 3. 计算相关性分数
    const scored = searchResults.map(result => ({
      ...result,
      relevanceScore: this.calculateRelevance(result, fileContext),
      insertionPoint: this.suggestInsertionPoint(result, fileContext)
    }));
    
    // 4. 过滤和排序
    return scored
      .filter(s => s.relevanceScore > 0.7)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }
  
  // 快捷键支持：Alt+E 快速注入
  registerShortcuts() {
    globalShortcut.register('Alt+E', async () => {
      // 显示快速注入面板
      const quickPanel = await this.showQuickInjectPanel();
      
      // 获取最近使用的上下文
      const recent = await this.getRecentlyUsedContexts(5);
      
      // 用户选择或自动推荐
      const selection = await quickPanel.show({ recent });
      
      // 执行注入
      await this.quickInject(selection.source, selection.target, 'adaptive');
    });
  }
}
```

#### 3.5.2 快速注入界面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Quick Inject (Alt+E)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Target: 🟢 Claude Code (Active in /home/user/api-service)                  │
│  Context Usage: 45% (9,000 / 20,000 tokens)                                 │
│                                                                             │
│  Recently Used:                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 🔷 Database Migration Pack (2 hours ago)                              │ │
│  │    📊 Used 3 times today                                              │ │
│  │    [Inject ▸]                                                         │ │
│  │                                                                       │ │
│  │ 🔷 JWT Auth Snippet (5 hours ago)                                     │ │
│  │    📊 Used 8 times total                                              │ │
│  │    [Inject ▸]                                                         │ │
│  │                                                                       │ │
│  │ 🔷 Rate Limiter Config (Yesterday)                                    │ │
│  │    [Inject ▸]                                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Smart Recommendations (based on current file: auth.middleware.ts):         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 💡 auth.middleware.ts - Similar to your code in "API Auth Refactor"   │ │
│  │    Similarity: 92%  •  6 code snippets available                      │ │
│  │    [Review & Inject]                                                  │ │
│  │                                                                       │ │
│  │ 💡 You mentioned "JWT refresh token" in current session               │ │
│  │    Related: Session 3 days ago ("JWT Token Strategy")                 │ │
│  │    [View Context]                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Search All Contexts:                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Type to search...                                                  │ │
│  │                                                                       │ │
│  │ Quick Filters: [Sessions] [Packs] [Snippets] [Decisions]              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [⚙️ Settings]  [📚 Browse All]  [🎯 Create from Selection]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Quick Inject Confirmation:
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inject: Database Migration Pack                                            │
│  Into: Claude Code session (api-service)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Content Preview:                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 Summary: Database migration from monolith to sharded architecture │ │
│  │ 🎯 8 Key Decisions                                                    │ │
│  │ 📦 12 Code Snippets                                                   │ │
│  │                                                                       │ │
│  │ Estimated size: ~6,500 tokens (will use 32% of context)               │ │
│  │ Context remaining after injection: ~10,500 tokens                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Injection Mode:                                                            │
│  (●) Smart - Adapt to conversation flow (Recommended)                       │
│  ( ) Prepend - Add to beginning of context                                  │
│  ( ) Append - Add as new message                                            │
│                                                                             │
│  [Cancel]  [🚀 Inject Now]                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 技术实现方案

### 4.1 系统架构

```
Echo Architecture:

┌─────────────────────────────────────────────────────────────────────────────┐
│  Layer 1: Interface                                                        │
│  ├── Browser Extension (Chrome/Edge/Firefox)                                │
│  ├── CLI Tool (echo-cli)                                                    │
│  ├── VS Code Extension (optional)                                           │
│  └── API Server (localhost:7777)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Core Engine                                                       │
│  ├── Agent Adapters (Claude Code, Aider, Cursor, Continue)                 │
│  ├── Watch Engine (file system monitoring)                                  │
│  ├── Compression Engine (PACS Tier 1-3)                                     │
│  ├── Migration Engine (context transfer)                                    │
│  ├── Injection Engine (quick context)                                       │
│  └── RAG Engine (semantic search)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Data & Storage                                                    │
│  ├── SQLite (primary storage)                                               │
│  ├── Vector DB (embeddings)                                                 │
│  ├── File System (snapshots, exports)                                       │
│  └── Sync (optional cloud backup)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Agent Platforms                                                   │
│  └── File system hooks (~/.claude, ~/.aider, ~/.cursor, ~/.continue)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 核心模块实现

```typescript
// ==================== Echo Core ====================

class EchoCore {
  private adapters: Map<string, AgentAdapter> = new Map();
  private watchEngine: WatchEngine;
  private compressionEngine: CompressionEngine;
  private migrationEngine: MigrationEngine;
  private injectionEngine: InjectionEngine;
  private storage: StorageManager;
  private ragEngine: RAGEngine;
  
  async initialize(): Promise<void> {
    // 1. 初始化存储
    await this.storage.initialize();
    
    // 2. 注册Agent适配器
    this.registerAdapter(new ClaudeCodeAdapter());
    this.registerAdapter(new AiderAdapter());
    this.registerAdapter(new CursorAdapter());
    this.registerAdapter(new ContinueDevAdapter());
    
    // 3. 启动文件监控
    await this.watchEngine.start();
    
    // 4. 启动API服务器
    await this.startAPIServer();
    
    // 5. 导入历史会话（后台）
    this.importHistoricalSessions();
    
    console.log('🎉 Echo is running!');
  }
  
  // 核心API
  async capture(platform: string, filePath: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    const messages = await adapter.parseIncremental(filePath);
    await this.storage.storeMessages(messages);
    await this.ragEngine.index(messages);
  }
  
  async compress(conversationId: string, level: CompressionLevel): Promise<CompressedView> {
    return this.compressionEngine.compress(conversationId, level);
  }
  
  async migrate(source: MigrationSource, target: MigrationTarget): Promise<MigrationResult> {
    return this.migrationEngine.migrate(source, target);
  }
  
  async inject(contextId: string, target: InjectionTarget): Promise<InjectionResult> {
    return this.injectionEngine.inject(contextId, target);
  }
  
  async search(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    return this.ragEngine.search(query, filters);
  }
}

// ==================== API Server ====================

class EchoAPIServer {
  private app: Express;
  private wss: WebSocketServer;
  
  async start(): Promise<void> {
    // REST API
    this.app.get('/api/conversations', this.listConversations);
    this.app.post('/api/search', this.search);
    this.app.post('/api/compress', this.compress);
    this.app.post('/api/migrate', this.migrate);
    this.app.post('/api/inject', this.inject);
    
    // WebSocket for real-time updates
    this.wss.on('connection', (ws) => {
      ws.on('message', this.handleWebSocketMessage);
    });
    
    this.app.listen(7777, '127.0.0.1');
  }
}
```

---

## 5. UI/UX设计

### 5.1 主界面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Echo - Your Vibe Coding Memory                                    [⚙️] [?] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Navigation                                                            │ │
│  │ ┌──────┬──────┬──────┬──────┬──────┬──────┐                          │ │
│  │ │ 💬   │ 💻   │ 📦   │ 🔄   │ 🔍   │ 📊   │                          │ │
│  │ │ All  │ Agent│ Pack │Migr. │Search│Stats │                          │ │
│  │ └──────┴──────┴──────┴──────┴──────┴──────┘                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Quick Actions                                                         │ │
│  │ [⚡ Quick Inject (Alt+E)]  [📤 Export]  [🔄 Migrate]  [📦 New Pack]   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [Main Content Area - changes based on navigation]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 快捷键系统

| 快捷键 | 功能 | 场景 |
|-------|------|------|
| `Alt+E` | 快速注入 | 全局 |
| `Alt+Shift+E` | 打开Echo面板 | 全局 |
| `Ctrl/Cmd+Shift+F` | 全局搜索 | 全局 |
| `Ctrl/Cmd+K` | 命令面板 | Echo内 |
| `Ctrl/Cmd+E` | 导出当前会话 | Echo内 |
| `Ctrl/Cmd+M` | 迁移当前会话 | Echo内 |

---

## 6. Roadmap

### Phase 1: Foundation (Week 1-6)
- [ ] Core engine with Claude Code support
- [ ] Basic capture and storage
- [ ] Browser extension UI
- [ ] Standard compression

### Phase 2: Multi-Agent (Week 7-10)
- [ ] Aider, Cursor, Continue.dev adapters
- [ ] Code library
- [ ] Semantic search
- [ ] Export system

### Phase 3: Migration (Week 11-14)
- [ ] Context pack system
- [ ] Session-to-session migration
- [ ] Multi-conversation summary
- [ ] Quick injection (Alt+E)

### Phase 4: Intelligence (Week 15-18)
- [ ] Smart recommendations
- [ ] Coding DNA analysis
- [ ] Pattern recognition
- [ ] Auto-context suggestions

### Phase 5: Collaboration (Week 19-22)
- [ ] Team sharing
- [ ] Knowledge base sync
- [ ] Organization features

---

**Echo** - *Your AI conversations, echoing forever*
