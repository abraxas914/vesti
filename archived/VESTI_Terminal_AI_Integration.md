# VESTI 终端AI助手集成方案

**目标**: 支持 Claude Code、Aider、Continue.dev 等终端AI工具的对话捕获  
**日期**: 2026年3月10日  
**可行性**: ✅ **完全可行**

---

## 执行摘要

Claude Code、Aider、Continue.dev 等终端AI工具的对话存储在本地文件系统中，VESTI可以通过**文件系统监控**和**日志解析**实现完整捕获。技术难度低，价值极高。

**核心价值**:
- 终端AI对话目前完全不可导出/搜索
- 开发者在这些工具中进行大量核心编程工作
- 会话历史包含宝贵的代码决策和架构思考

---

## 一、Claude Code 数据结构分析

### 1.1 存储位置

```
~/.claude/
├── history.jsonl           # 全局输入历史（所有项目）
├── projects/               # 按项目组织的完整对话
│   └── {project-name}/     # 项目名称（如 -mnt-c-VESTI）
│       ├── {sessionId}.jsonl      # 完整消息流
│       └── {sessionId}/           # 文件快照目录
├── todos/                  # 任务记录
├── cache/                  # 缓存
└── settings.json           # 用户设置
```

### 1.2 消息格式

**history.jsonl** - 仅包含用户输入:
```json
{
  "display": "用户输入的内容",
  "pastedContents": {},
  "timestamp": 1772118376704,
  "project": "/mnt/d/ncbi",
  "sessionId": "1ec43bda-fb43-4ec1-a399-af708e2fc9a3"
}
```

**{sessionId}.jsonl** - 完整对话流:
```json
// 1. 用户消息
{
  "type": "user",
  "message": {"role": "user", "content": "请优化这段代码"},
  "uuid": "780e7936-bf22-414e-a046-45e1aa8b181c",
  "sessionId": "82c9b303-f1e4-4570-a900-eaa5a016e492",
  "timestamp": "2026-03-09T15:07:31.566Z"
}

// 2. AI思考过程 (thinking)
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{
      "type": "thinking",
      "thinking": "用户要求优化代码，我需要先分析现有实现..."
    }]
  },
  "parentUuid": "780e7936-bf22-414e-a046-45e1aa8b181c",
  "uuid": "fdc14991-3619-4877-a30e-6cc4ca53dfb9"
}

// 3. AI回复 (text)
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{
      "type": "text",
      "text": "我来帮你优化。首先分析现有架构..."
    }]
  },
  "parentUuid": "fdc14991-3619-4877-a30e-6cc4ca53dfb9",
  "uuid": "42c3386d-8652-4178-879d-22d906bbf98f"
}

// 4. 工具调用
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{
      "type": "tool_use",
      "id": "tooluse_X9vRAmrCkXvIlM37Uk7OcN",
      "name": "Read",
      "input": {"file_path": "/path/to/file.ts"}
    }]
  }
}

// 5. 工具结果
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{
      "type": "tool_result",
      "tool_use_id": "tooluse_X9vRAmrCkXvIlM37Uk7OcN",
      "content": "文件内容..."
    }]
  },
  "parentToolUseID": "tooluse_X9vRAmrCkXvIlM37Uk7OcN"
}

// 6. 进度更新
{
  "type": "progress",
  "data": {
    "type": "hook_progress",
    "hookEvent": "PostToolUse",
    "hookName": "PostToolUse:Read"
  }
}
```

### 1.3 关键字段映射

| Claude Code字段 | VESTI字段 | 说明 |
|---------------|----------|------|
| `sessionId` | `conversationId` | 会话唯一标识 |
| `uuid` / `parentUuid` | `messageId` / `parentId` | 消息树结构 |
| `timestamp` | `timestamp` | ISO 8601格式 |
| `message.content` | `content` | 消息内容（多类型数组） |
| `cwd` | `projectPath` | 当前工作目录 |
| `gitBranch` | `metadata.branch` | Git分支 |
| `type` | `role` | user/assistant/system |

---

## 二、Aider 数据结构分析

### 2.1 存储位置

```
~/.aider/
├── chat_history/           # 聊天历史
│   └── {timestamp}_{model}.md
└── ...

# 或在项目目录
.aider.chat.history.md
```

### 2.2 消息格式

Aider使用Markdown格式存储对话:

```markdown
# aider chat started at 2026-03-10 10:00:00

#### You:
请帮我重构这个函数

#### Assistant:
我来帮你重构。首先看看当前实现...

```python
def old_function():
    pass
```

建议改为：

```python
def new_function():
    pass
```

#### You:
应用到文件

#### Assistant:
已应用更改。
```

---

## 三、Continue.dev 数据结构分析

### 3.1 存储位置

```
~/.continue/
├── config.json            # 配置
├── sessions/              # 会话历史
│   └── {sessionId}.json
└── index/                 # 代码索引
```

### 3.2 消息格式

```json
{
  "sessionId": "uuid",
  "title": "Session Title",
  "messages": [
    {
      "role": "user",
      "content": "请解释这段代码",
      "timestamp": 1234567890
    },
    {
      "role": "assistant",
      "content": "这段代码实现了...",
      "timestamp": 1234567891
    }
  ],
  "context": {
    "workspace": "/path/to/project"
  }
}
```

---

## 四、集成方案设计

### 4.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    VESTI Extension                          │
├─────────────────────────────────────────────────────────────┤
│  Terminal AI Adapter Layer                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │ Claude Code │ │    Aider    │ │   Continue.dev      │  │
│  │   Adapter   │ │   Adapter   │ │      Adapter        │  │
│  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘  │
│         │               │                   │              │
│         └───────────────┼───────────────────┘              │
│                         ▼                                  │
│              ┌─────────────────────┐                      │
│              │  Unified Message    │                      │
│              │  Format Converter   │                      │
│              └──────────┬──────────┘                      │
│                         ▼                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           File System Watcher                       │  │
│  │  - Watch ~/.claude/projects/*.jsonl                 │  │
│  │  - Watch ~/.aider/chat_history/                     │  │
│  │  - Watch ~/.continue/sessions/                      │  │
│  └─────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Core VESTI Pipeline                                        │
│  ├── PACS Compression (Tier 1-3)                          │
│  ├── IndexedDB Storage                                    │
│  ├── Export Service                                       │
│  └── Insight Generation                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心模块设计

#### 模块1: FileSystemWatcher

```typescript
// src/lib/terminal-ai/watcher.ts

interface WatchTarget {
  tool: 'claude-code' | 'aider' | 'continue-dev';
  path: string;
  pattern: string;
  parser: (content: string) => TerminalMessage[];
}

class TerminalAIWatcher {
  private watchers: Map<string, FSWatcher> = new Map();
  
  // 监控目标配置
  private targets: WatchTarget[] = [
    {
      tool: 'claude-code',
      path: '~/.claude/projects',
      pattern: '**/*.jsonl',
      parser: this.parseClaudeCodeMessage
    },
    {
      tool: 'aider',
      path: '~/.aider/chat_history',
      pattern: '*.md',
      parser: this.parseAiderMessage
    },
    {
      tool: 'continue-dev',
      path: '~/.continue/sessions',
      pattern: '*.json',
      parser: this.parseContinueMessage
    }
  ];

  async start(): Promise<void> {
    for (const target of this.targets) {
      await this.watchTarget(target);
    }
  }

  private async watchTarget(target: WatchTarget): Promise<void> {
    const watcher = chokidar.watch(target.path, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    watcher.on('change', async (filePath) => {
      if (minimatch(filePath, target.pattern)) {
        await this.handleFileChange(filePath, target);
      }
    });

    this.watchers.set(target.tool, watcher);
  }

  private async handleFileChange(
    filePath: string, 
    target: WatchTarget
  ): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const messages = target.parser(content);
    
    // 只处理新增的消息
    const newMessages = await this.filterNewMessages(filePath, messages);
    
    for (const msg of newMessages) {
      await this.processMessage(msg, target.tool);
    }
  }
}
```

#### 模块2: Claude Code Parser

```typescript
// src/lib/terminal-ai/parsers/claude-code.ts

interface ClaudeMessage {
  type: 'user' | 'assistant' | 'progress' | 'file-history-snapshot';
  uuid?: string;
  parentUuid?: string;
  sessionId: string;
  timestamp: string;
  message?: {
    role: 'user' | 'assistant';
    content: string | ClaudeContentBlock[];
  };
  cwd?: string;
  gitBranch?: string;
}

interface ClaudeContentBlock {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result';
  thinking?: string;
  text?: string;
  name?: string;
  input?: any;
  content?: any;
}

class ClaudeCodeParser {
  parse(jsonlContent: string): UnifiedMessage[] {
    const lines = jsonlContent.trim().split('\n');
    const messages: UnifiedMessage[] = [];
    
    for (const line of lines) {
      try {
        const msg: ClaudeMessage = JSON.parse(line);
        
        // 跳过非对话消息
        if (msg.type === 'progress' || msg.type === 'file-history-snapshot') {
          continue;
        }
        
        const unified = this.convertToUnified(msg);
        if (unified) {
          messages.push(unified);
        }
      } catch (e) {
        console.error('Failed to parse line:', line);
      }
    }
    
    return messages;
  }

  private convertToUnified(msg: ClaudeMessage): UnifiedMessage | null {
    if (!msg.message) return null;

    const content = this.extractContent(msg.message.content);
    
    return {
      id: msg.uuid || generateUUID(),
      parentId: msg.parentUuid,
      conversationId: msg.sessionId,
      role: msg.message.role,
      content: content.text,
      thinking: content.thinking,
      timestamp: new Date(msg.timestamp).getTime(),
      metadata: {
        source: 'claude-code',
        projectPath: msg.cwd,
        gitBranch: msg.gitBranch,
        toolCalls: content.toolCalls,
        toolResults: content.toolResults
      }
    };
  }

  private extractContent(
    content: string | ClaudeContentBlock[]
  ): {
    text: string;
    thinking?: string;
    toolCalls?: any[];
    toolResults?: any[];
  } {
    if (typeof content === 'string') {
      return { text: content };
    }

    const text: string[] = [];
    const thinking: string[] = [];
    const toolCalls: any[] = [];
    const toolResults: any[] = [];

    for (const block of content) {
      switch (block.type) {
        case 'text':
          if (block.text) text.push(block.text);
          break;
        case 'thinking':
          if (block.thinking) thinking.push(block.thinking);
          break;
        case 'tool_use':
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input
          });
          break;
        case 'tool_result':
          toolResults.push({
            toolUseId: block.tool_use_id,
            content: block.content
          });
          break;
      }
    }

    return {
      text: text.join('\n'),
      thinking: thinking.join('\n') || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined
    };
  }
}
```

#### 模块3: Aider Parser

```typescript
// src/lib/terminal-ai/parsers/aider.ts

class AiderParser {
  parse(markdownContent: string): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];
    const lines = markdownContent.split('\n');
    
    let currentRole: 'user' | 'assistant' | null = null;
    let currentContent: string[] = [];
    let currentTimestamp: number = Date.now();

    for (const line of lines) {
      // 检测消息边界
      if (line.startsWith('#### You:')) {
        if (currentRole) {
          messages.push(this.createMessage(
            currentRole, 
            currentContent.join('\n'),
            currentTimestamp
          ));
        }
        currentRole = 'user';
        currentContent = [];
      } else if (line.startsWith('#### Assistant:')) {
        if (currentRole) {
          messages.push(this.createMessage(
            currentRole, 
            currentContent.join('\n'),
            currentTimestamp
          ));
        }
        currentRole = 'assistant';
        currentContent = [];
      } else if (line.startsWith('# aider chat started at')) {
        // 提取时间戳
        const match = line.match(/started at (.+)$/);
        if (match) {
          currentTimestamp = new Date(match[1]).getTime();
        }
      } else if (currentRole) {
        currentContent.push(line);
      }
    }

    // 处理最后一条消息
    if (currentRole && currentContent.length > 0) {
      messages.push(this.createMessage(
        currentRole, 
        currentContent.join('\n'),
        currentTimestamp
      ));
    }

    return messages;
  }

  private createMessage(
    role: 'user' | 'assistant', 
    content: string,
    timestamp: number
  ): UnifiedMessage {
    return {
      id: generateUUID(),
      conversationId: 'aider-session', // 需要从文件名提取
      role,
      content: content.trim(),
      timestamp,
      metadata: {
        source: 'aider'
      }
    };
  }
}
```

### 4.3 数据流设计

```
┌────────────────────────────────────────────────────────────────┐
│                      数据流向图                                 │
└────────────────────────────────────────────────────────────────┘

Claude Code                      VESTI
   │                               │
   │  ~/.claude/projects/*.jsonl   │
   │──────────────────────────────>│
   │                               │
   │         file change event     │
   │──────────────────────────────>│  ┌─────────────────┐
   │                               │  │  File Watcher   │
   │                               │  └────────┬────────┘
   │                               │           │
   │                               │           ▼
   │                               │  ┌─────────────────┐
   │                               │  │ Claude Parser   │
   │                               │  └────────┬────────┘
   │                               │           │
   │                               │           ▼
   │                               │  ┌─────────────────┐
   │                               │  │ Unified Format  │
   │                               │  └────────┬────────┘
   │                               │           │
   │                               │           ▼
   │                               │  ┌─────────────────┐
   │                               │  │ PACS Compression│
   │                               │  └────────┬────────┘
   │                               │           │
   │                               │           ▼
   │                               │  ┌─────────────────┐
   │                               │  │  IndexedDB      │
   │                               │  │  Storage        │
   │                               │  └────────┬────────┘
   │                               │           │
   │                               │           ▼
   │    可搜索/导出/洞察           │  ┌─────────────────┐
   │<──────────────────────────────│  │  Export/Insight │
   │                               │  └─────────────────┘
```

---

## 五、UI/UX 设计

### 5.1 新的侧边栏标签页

```
┌────────────────────────────────────────────────────────┐
│  📁 Conversations │ 🔍 Search │ ⚙️ Settings │ 🖥️ Terminal│
├────────────────────────────────────────────────────────┤
│  Terminal AI Sessions                                  │
│  ┌────────────────────────────────────────────────────┐│
│  │ 🔍 Search terminal sessions...                     ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  📊 Claude Code (12 sessions)                          │
│  ├── 🟢 scgb-agent-bak (5 messages, 2 min ago)        │
│  ├── ⚪ VESTI (88 messages, 2 hours ago)              │
│  └── ⚪ ncbi (45 messages, yesterday)                 │
│                                                        │
│  📊 Aider (3 sessions)                                 │
│  ├── 🟢 my-project (20 messages, 5 min ago)           │
│  └── ⚪ another-repo (15 messages, 1 day ago)         │
│                                                        │
│  📊 Continue.dev (8 sessions)                          │
│  └── ...                                               │
│                                                        │
│  [⚙️ Configure Terminal Tools]                         │
└────────────────────────────────────────────────────────┘
```

### 5.2 终端会话查看器

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Sessions                     [📥 Export] [🗑️]    │
├─────────────────────────────────────────────────────────────┤
│  📁 VESTI/compression_optimization                          │
│  🕐 Mar 9, 2026, 3:07 PM                                    │
│  📍 /mnt/c/Users/a/Documents/GitHub/VESTI                   │
│  🌿 codex/explore-agent-attempt                             │
│  💬 88 messages                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 You (3:07 PM)                                           │
│  ─────────────────────────────────────────────────────────  │
│  很好，目前我需要对于目前项目的压缩机制继续进行深入优化...   │
│                                                             │
│  🤖 Claude (3:07 PM)                                        │
│  ─────────────────────────────────────────────────────────  │
│  [💭 Thinking] 用户要求优化代码，我需要先分析现有实现...     │
│  ─────────────────────────────────────────────────────────  │
│  我看到你已经有了一个非常详细的压缩优化设计文档...           │
│                                                             │
│  🤖 Claude (3:08 PM)                                        │
│  ─────────────────────────────────────────────────────────  │
│  🔧 Tool: Read                                              │
│  File: /mnt/c/.../compression_optimization_design.md        │
│  ─────────────────────────────────────────────────────────  │
│  好的，我已经读取了现有的压缩优化设计文档...                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [Show 10 more messages]                                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 设置面板

```
┌─────────────────────────────────────────────────────────────┐
│  Terminal AI Integration                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☑️ Enable Terminal AI Capture                              │
│                                                             │
│  ─── Claude Code ────────────────────────────────────────  │
│  ☑️ Enable Claude Code capture                              │
│     Detected at: ~/.claude                                  │
│     [Re-scan]                                               │
│                                                             │
│  ─── Aider ───────────────────────────────────────────────  │
│  ☑️ Enable Aider capture                                    │
│     Detected at: ~/.aider                                   │
│                                                             │
│  ─── Continue.dev ────────────────────────────────────────  │
│  ☐ Enable Continue.dev capture                              │
│     Not detected. Install Continue.dev to enable.           │
│                                                             │
│  ─── Advanced ────────────────────────────────────────────  │
│  ☑️ Capture thinking/reasoning content                      │
│  ☑️ Include tool calls in export                            │
│  ☐ Include file snapshots (large)                           │
│  ☐ Auto-delete after 30 days                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、实现路线图

### Phase 1: Claude Code MVP (2-3周)

**目标**: 支持Claude Code捕获

**任务**:
- [ ] 文件系统watcher模块
- [ ] Claude Code JSONL解析器
- [ ] 统一消息格式转换
- [ ] 新增"Terminal"侧边栏标签
- [ ] 基础会话查看器
- [ ] IndexedDB存储适配

**交付物**:
- 可捕获Claude Code对话
- 支持搜索和基础导出

### Phase 2: 多工具支持 (2周)

**目标**: 支持Aider和Continue.dev

**任务**:
- [ ] Aider Markdown解析器
- [ ] Continue.dev JSON解析器
- [ ] 统一适配器接口
- [ ] 自动检测安装的工具

### Phase 3: 高级功能 (2-3周)

**目标**: 生产级功能

**任务**:
- [ ] PACS压缩集成（对终端对话进行智能压缩）
- [ ] 代码片段提取和高亮
- [ ] Git上下文关联（分支、提交）
- [ ] 工具调用可视化
- [ ] 批量导出和归档

### Phase 4: 洞察集成 (2周)

**目标**: 利用终端对话生成洞察

**任务**:
- [ ] 代码决策追踪
- [ ] 架构演进分析
- [ ] 编程模式识别
- [ ] 与浏览器对话的关联分析

---

## 七、技术挑战与解决方案

### 挑战1: 大文件性能

**问题**: Claude Code的JSONL文件可能很大（MB级别），频繁读写

**解决方案**:
- 增量解析：只读取新增行
- 使用文件位置索引（记录最后读取位置）
- 大文件分块处理

```typescript
class IncrementalParser {
  private filePositions: Map<string, number> = new Map();

  async parseIncrementally(filePath: string): Promise<Message[]> {
    const lastPosition = this.filePositions.get(filePath) || 0;
    const stats = await fs.stat(filePath);
    
    if (stats.size <= lastPosition) {
      return []; // 无新内容
    }

    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(stats.size - lastPosition);
    
    await fd.read(buffer, 0, buffer.length, lastPosition);
    await fd.close();

    const newContent = buffer.toString('utf-8');
    const lines = newContent.trim().split('\n');
    
    this.filePositions.set(filePath, stats.size);
    
    return lines.map(line => JSON.parse(line));
  }
}
```

### 挑战2: 消息去重

**问题**: 文件watch可能触发多次，或重启后需要避免重复存储

**解决方案**:
- 使用uuid作为去重键
- IndexedDB中建立唯一索引
- 批量插入时忽略重复错误

### 挑战3: 跨平台路径

**问题**: Windows/macOS/Linux路径格式不同

**解决方案**:
- 使用Node.js的`path`模块
- 存储相对路径或规范化路径
- 使用`os.homedir()`获取主目录

### 挑战4: 隐私和安全

**问题**: 终端对话可能包含敏感信息（密码、API密钥）

**解决方案**:
- 本地存储，不上传云端
- 提供敏感内容检测和提醒
- 支持会话级加密（可选）
- 快速删除功能

---

## 八、差异化价值

### 8.1 市场现状

| 工具 | 有导出功能 | 有搜索功能 | 有洞察功能 |
|-----|----------|----------|----------|
| Claude Code | ❌ | ❌ | ❌ |
| Aider | ❌ | ❌ | ❌ |
| Continue.dev | ⚠️ 基础 | ⚠️ 基础 | ❌ |
| **VESTI** | ✅ | ✅ | ✅ |

### 8.2 独特价值

**1. 跨工具统一视图**
```
你在Claude Code中的架构决策
    ↓ VESTI关联
你在浏览器Claude.ai中的相关讨论
    ↓ VESTI洞察
完整的决策链路追踪
```

**2. 编程上下文保留**
- Git分支和工作目录信息
- 工具调用历史（读了哪些文件）
- 代码变更关联

**3. AI辅助的代码知识管理**
- 自动提取关键代码片段
- 识别常用设计模式
- 追踪技术债务讨论

---

## 九、结论

### 9.1 可行性结论

✅ **强烈推荐开发**

- **技术难度**: 低-中等（文件解析+监控）
- **开发周期**: 6-10周完整版
- **代码复用**: 可复用现有PACS、存储、导出等模块
- **用户价值**: 极高（填补市场空白）

### 9.2 下一步行动

1. **立即行动**:
   - 实现Claude Code JSONL解析器原型
   - 验证文件watch性能
   - 设计统一消息格式

2. **短期目标** (MVP):
   - 支持Claude Code捕获和导出
   - 基础UI展示
   - 内测验证

3. **长期愿景**:
   - 支持所有主流终端AI工具
   - 成为开发者AI编程记忆的"第二大脑"
   - 与浏览器扩展形成完整闭环

---

**VESTI + Terminal AI = 开发者完整的AI对话历史管理方案**
