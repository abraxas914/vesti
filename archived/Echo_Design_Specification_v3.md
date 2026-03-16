# Echo v3.0 - 全量持久化Vibe Coding记忆系统

**代号**: Echo  
**版本**: v3.0  
**核心升级**: 全量捕获、持久化存储、多平台扩展  
**日期**: 2026年3月

---

## 目录

1. [核心设计原则](#1-核心设计原则)
2. [全量存储架构](#2-全量存储架构)
3. [持久化策略](#3-持久化策略)
4. [扩展平台支持](#4-扩展平台支持)
5. [数据生命周期管理](#5-数据生命周期管理)
6. [技术实现细节](#6-技术实现细节)

---

## 1. 核心设计原则

### 1.1 数据主权原则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Echo Data Sovereignty Model                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent工具    →    Echo捕获    →    持久化存储    →    永久可用              │
│  ─────────      ───────────      ─────────────      ───────────             │
│                                                                             │
│  • Claude Code    • 实时监听      • 独立存储路径    • 工具卸载后仍可访问      │
│  • Aider          • 全量解析      • 版本控制        • 跨设备同步              │
│  • Kimi Code      • 增量同步      • 加密保护        • 数据导出                │
│                                                                             │
│  关键承诺:                                                                   │
│  ✅ 即使Agent工具删除/重装，历史数据永不丢失                                 │
│  ✅ 数据存储在用户可控的独立路径                                            │
│  ✅ 支持全量导出，随时可迁移                                                │
│  ✅ 端到端加密，保护敏感对话                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 全量捕获原则

```typescript
// Echo全量捕获承诺
interface EchoCapturePromise {
  // 1. 消息级别全量
  messageCompleteness: {
    userMessages: true;        // 100%捕获
    aiMessages: true;          // 100%捕获
    thinking: true;            // 100%捕获（Claude Code）
    toolCalls: true;           // 100%捕获
    toolResults: true;         // 100%捕获
    systemMessages: true;      // 100%捕获
  };
  
  // 2. 上下文全量
  contextCompleteness: {
    fileAccesses: true;        // AI读取的文件
    fileModifications: true;   // AI修改的文件
    commandExecutions: true;   // 执行的命令
    gitOperations: true;       // Git操作记录
    environment: true;         // 环境变量/路径
  };
  
  // 3. 时间全量
  temporalCompleteness: {
    startTimestamp: true;      // 会话开始时间
    endTimestamp: true;        // 会话结束时间
    messageTimestamps: true;   // 每条消息时间
    activityGaps: true;        // 空闲时间记录
  };
  
  // 4. 元数据全量
  metadataCompleteness: {
    projectPath: true;         // 工作目录
    gitBranch: true;           // Git分支
    gitCommit: true;           // 提交哈希
    dependencies: true;        // 项目依赖
    runtimeVersions: true;     // Node/Python等版本
  };
}
```

---

## 2. 全量存储架构

### 2.1 三级存储体系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Echo Three-Tier Storage System                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tier 1: Raw Data Vault (原始数据仓库)                                       │
│  ─────────────────────────────────────                                      │
│  位置: ~/.echo/vault/                                                       │
│  内容: Agent工具原始文件的完整备份                                          │
│  策略: 写入即永久保留，不可修改                                             │
│                                                                             │
│  结构:                                                                      │
│  ~/.echo/vault/                                                             │
│  ├── claude-code/                                                           │
│  │   └── raw/                                                                │
│  │       └── {timestamp}_{sessionId}.jsonl.gz                              │
│  ├── aider/                                                                 │
│  │   └── raw/                                                                │
│  │       └── {timestamp}_{sessionId}.md.gz                                  │
│  ├── kimi-code/                                                             │
│  │   └── raw/                                                                │
│  │       └── {timestamp}_{sessionId}.json.gz                               │
│  └── .../                                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tier 2: Structured Database (结构化数据库)                                  │
│  ──────────────────────────────────────────                                 │
│  位置: ~/.echo/db/echo.db                                                   │
│  内容: 解析后的结构化数据，支持查询和索引                                     │
│  策略: 规范化存储，支持全文本搜索和向量检索                                   │
│                                                                             │
│  核心表:                                                                    │
│  • conversations - 会话主表                                                 │
│  • messages - 消息全量表                                                    │
│  • message_thinking - Thinking过程表                                        │
│  • tool_calls - 工具调用记录                                                │
│  • file_operations - 文件操作日志                                           │
│  • code_snippets - 代码片段库                                               │
│  • embeddings - 向量数据                                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tier 3: Asset Archive (资产归档库)                                          │
│  ─────────────────────────────────                                          │
│  位置: ~/.echo/assets/                                                      │
│  内容: 可复用资产（代码、配置、文档）                                         │
│  策略: 精选提取，支持版本控制和复用                                           │
│                                                                             │
│  结构:                                                                      │
│  ~/.echo/assets/                                                            │
│  ├── code/                    # 可复用代码                                  │
│  │   ├── {language}/                                                        │
│  │   └── snippets/                                                          │
│  ├── configs/                 # 配置文件模板                                │
│  ├── prompts/                 # 提示词模板                                  │
│  └── docs/                    # 生成的文档                                  │
│      └── adr/                 # 架构决策记录                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据库Schema（全量版）

```sql
-- Echo v3.0 Full Database Schema

-- 会话表：全量元数据
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,                          -- UUID
    echo_id TEXT UNIQUE NOT NULL,                 -- echo_xxx 格式
    
    -- 来源信息（不可变）
    platform TEXT NOT NULL,                       -- claude-code, aider, kimi-code
    platform_version TEXT,                        -- 工具版本
    agent_type TEXT,                              -- claude-3.5-sonnet, kimi-k2等
    
    -- 会话标识
    session_id TEXT NOT NULL,                     -- Agent原生ID
    project_path TEXT NOT NULL,                   -- 工作目录绝对路径
    project_hash TEXT,                            -- 项目路径哈希（用于查询）
    
    -- Git上下文（全量记录）
    git_remote TEXT,                              -- 远程仓库URL
    git_branch TEXT,                              -- 分支名
    git_commit TEXT,                              -- 提交哈希
    git_commit_message TEXT,                      -- 提交信息
    git_is_dirty BOOLEAN,                         -- 是否有未提交更改
    git_changed_files TEXT,                       -- JSON数组：变更文件列表
    
    -- 时间信息（精确到毫秒）
    started_at INTEGER NOT NULL,                  -- 开始时间戳
    ended_at INTEGER,                             -- 结束时间戳
    last_activity_at INTEGER,                     -- 最后活动时间
    duration_ms INTEGER,                          -- 总时长
    
    -- 统计信息（实时更新）
    message_count INTEGER DEFAULT 0,
    user_message_count INTEGER DEFAULT 0,
    ai_message_count INTEGER DEFAULT 0,
    thinking_count INTEGER DEFAULT 0,             -- thinking消息数
    thinking_tokens INTEGER DEFAULT 0,            -- thinking总token
    tool_call_count INTEGER DEFAULT 0,
    code_block_count INTEGER DEFAULT 0,
    file_access_count INTEGER DEFAULT 0,
    file_modification_count INTEGER DEFAULT 0,
    
    -- 元数据
    title TEXT,                                   -- 自动提取或手动设置
    summary TEXT,                                 -- AI生成的摘要
    tags TEXT,                                    -- JSON数组
    category TEXT,                                -- architecture, bugfix, feature
    
    -- 状态
    status TEXT DEFAULT 'active',                 -- active, archived, migrated
    is_favorite BOOLEAN DEFAULT FALSE,
    is_compressed BOOLEAN DEFAULT FALSE,          -- 是否已压缩归档
    
    -- 原始数据引用
    raw_vault_path TEXT,                          -- Tier 1原始文件路径
    
    -- 版本控制
    schema_version INTEGER DEFAULT 3,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 消息表：全量消息存储
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    echo_id TEXT UNIQUE NOT NULL,
    conversation_id TEXT NOT NULL,
    
    -- 消息关系（树形结构）
    parent_id TEXT,                               -- 父消息ID
    root_id TEXT,                                 -- 根消息ID（线程起点）
    depth INTEGER DEFAULT 0,                      -- 树深度
    
    -- 消息类型
    role TEXT NOT NULL,                           -- user, assistant, system
    message_type TEXT NOT NULL,                   -- message, thinking, tool_use, tool_result
    
    -- 内容（全量存储）
    content_text TEXT,                            -- 主文本内容
    content_thinking TEXT,                        -- Thinking过程（Claude）
    content_tool_name TEXT,                       -- 工具名
    content_tool_input TEXT,                      -- 工具输入（JSON）
    content_tool_output TEXT,                     -- 工具输出（JSON）
    content_tool_error TEXT,                      -- 工具错误
    
    -- 代码块（预提取，加速查询）
    code_blocks TEXT,                             -- JSON数组: [{language, code, lines}]
    
    -- 时间
    timestamp INTEGER NOT NULL,                   -- 消息时间戳
    
    -- 上下文快照
    context_cwd TEXT,                             -- 当前工作目录
    context_git_branch TEXT,                      -- 当前分支
    context_open_files TEXT,                      -- JSON数组：打开的文件
    context_env_vars TEXT,                        -- JSON对象：相关环境变量
    
    -- Token统计（如果有）
    token_count_input INTEGER,                    -- 输入token
    token_count_output INTEGER,                   -- 输出token
    
    -- 派生数据标记
    has_decision BOOLEAN DEFAULT FALSE,           -- 是否包含决策
    has_code BOOLEAN DEFAULT FALSE,               -- 是否包含代码
    has_error BOOLEAN DEFAULT FALSE,              -- 是否包含错误
    
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES messages(id)
);

-- Thinking详情表：单独存储thinking过程
CREATE TABLE message_thinking (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    
    thinking_content TEXT NOT NULL,               -- 完整thinking文本
    thinking_length INTEGER,                      -- 字符长度
    token_count INTEGER,                          -- token数（估算）
    
    -- Thinking元数据
    reasoning_steps INTEGER,                      -- 推理步骤数（启发式估算）
    confidence_score REAL,                        -- 置信度（如果有）
    
    -- 派生：从thinking中提取的关键信息
    extracted_insights TEXT,                      -- JSON数组：提取的洞察
    extracted_plan TEXT,                          -- 提取的执行计划
    
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 工具调用详情表
CREATE TABLE tool_calls (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    tool_call_id TEXT,                            -- Agent原生ID
    
    tool_name TEXT NOT NULL,                      -- 工具名
    tool_display_name TEXT,                       -- 显示名
    
    -- 输入
    input_params TEXT,                            -- JSON：完整输入参数
    input_summary TEXT,                           -- 摘要（用于显示）
    
    -- 输出
    output_content TEXT,                          -- 完整输出
    output_summary TEXT,                          -- 摘要
    output_type TEXT,                             -- text, json, file_list等
    
    -- 执行信息
    execution_status TEXT,                        -- success, error, timeout
    execution_duration_ms INTEGER,                -- 执行时长
    error_message TEXT,                           -- 错误信息
    
    -- 文件操作（如果是文件相关工具）
    affected_files TEXT,                          -- JSON数组：影响的文件
    
    timestamp INTEGER NOT NULL,
    
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 文件操作日志表：全量记录文件访问和修改
CREATE TABLE file_operations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    
    operation_type TEXT NOT NULL,                 -- read, write, create, delete, move
    file_path TEXT NOT NULL,                      -- 文件绝对路径
    file_hash TEXT,                               -- 文件内容哈希
    
    -- 文件内容（可选，用于恢复）
    content_before TEXT,                          -- 修改前内容
    content_after TEXT,                           -- 修改后内容
    diff_patch TEXT,                              -- diff格式补丁
    
    -- 元数据
    file_size_before INTEGER,
    file_size_after INTEGER,
    line_count_before INTEGER,
    line_count_after INTEGER,
    
    -- 来源
    source TEXT,                                  -- tool_call, editor, command
    tool_name TEXT,                               -- 如果是工具操作
    
    timestamp INTEGER NOT NULL,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 代码片段表：提取的可复用代码
CREATE TABLE code_snippets (
    id TEXT PRIMARY KEY,
    echo_id TEXT UNIQUE NOT NULL,
    
    -- 来源
    conversation_id TEXT NOT NULL,
    message_id TEXT,
    tool_call_id TEXT,                            -- 可能来自工具输出
    
    -- 代码内容
    code_content TEXT NOT NULL,
    code_language TEXT NOT NULL,
    code_hash TEXT,                               -- 代码内容哈希（去重）
    
    -- 位置信息
    file_path TEXT,                               -- 原始文件路径
    line_start INTEGER,
    line_end INTEGER,
    
    -- AST信息（用于相似度匹配）
    ast_fingerprint TEXT,                         -- AST结构指纹
    function_names TEXT,                          -- JSON数组：函数名
    class_names TEXT,                             -- JSON数组：类名
    import_statements TEXT,                       -- JSON数组：导入语句
    
    -- 元数据
    title TEXT,                                   -- 自动或手动设置
    description TEXT,
    tags TEXT,                                    -- JSON数组
    
    -- 使用统计
    usage_copy_count INTEGER DEFAULT 0,
    usage_apply_count INTEGER DEFAULT 0,
    usage_last_at INTEGER,
    usage_applied_to TEXT,                        -- JSON数组：应用到的项目
    
    -- 演化关系
    evolved_from_id TEXT,                         -- 演化来源
    evolved_to_ids TEXT,                          -- JSON数组：演化去向
    
    -- 向量（用于语义搜索）
    embedding BLOB,                               -- 二进制向量数据
    
    is_archived BOOLEAN DEFAULT FALSE,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 向量索引表（用于相似度搜索）
CREATE TABLE embeddings (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,                    -- conversation, message, code_snippet
    entity_id TEXT NOT NULL,
    
    embedding_model TEXT,                         -- 使用的模型
    embedding_version INTEGER,
    embedding_data BLOB NOT NULL,                 -- 二进制向量
    embedding_dim INTEGER,                        -- 向量维度
    
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 上下文包表：可复用的知识单元
CREATE TABLE context_packs (
    id TEXT PRIMARY KEY,
    echo_id TEXT UNIQUE NOT NULL,
    
    -- 来源
    source_conversation_ids TEXT NOT NULL,        -- JSON数组
    source_type TEXT,                             -- single, multi, merged
    
    -- 内容
    content_summary TEXT NOT NULL,
    content_decisions TEXT,                       -- JSON数组
    content_code_snippet_ids TEXT,                -- JSON数组
    content_qa_pairs TEXT,                        -- JSON数组
    content_file_refs TEXT,                       -- JSON数组
    
    -- 元数据
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT,                                    -- JSON数组
    category TEXT,
    domain TEXT,                                  -- 技术领域
    
    -- 项目信息
    source_project_path TEXT,
    target_project_paths TEXT,                    -- JSON数组：已应用的项目
    
    -- 使用统计
    usage_import_count INTEGER DEFAULT 0,
    usage_last_at INTEGER,
    
    -- 向量
    embedding BLOB,
    
    is_template BOOLEAN DEFAULT FALSE,            -- 是否为模板
    is_shared BOOLEAN DEFAULT FALSE,              -- 是否分享
    
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 原始数据仓库索引表
CREATE TABLE raw_vault_index (
    id TEXT PRIMARY KEY,
    
    vault_path TEXT NOT NULL,                     -- 文件路径
    platform TEXT NOT NULL,
    session_id TEXT,
    
    file_size INTEGER,
    file_hash TEXT,                               -- SHA256
    compression_type TEXT,                        -- gzip, zstd
    
    -- 时间范围
    first_message_at INTEGER,
    last_message_at INTEGER,
    
    -- 解析状态
    is_parsed BOOLEAN DEFAULT FALSE,
    parsed_at INTEGER,
    conversation_id TEXT,                         -- 关联的conversation
    
    archived_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 索引优化
CREATE INDEX idx_conversations_platform ON conversations(platform);
CREATE INDEX idx_conversations_project ON conversations(project_hash);
CREATE INDEX idx_conversations_time ON conversations(started_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_type ON messages(message_type);

CREATE INDEX idx_file_ops_conversation ON file_operations(conversation_id);
CREATE INDEX idx_file_ops_path ON file_operations(file_path);
CREATE INDEX idx_file_ops_time ON file_operations(timestamp DESC);

CREATE INDEX idx_code_snippets_lang ON code_snippets(code_language);
CREATE INDEX idx_code_snippets_hash ON code_snippets(code_hash);
CREATE INDEX idx_code_snippets_conv ON code_snippets(conversation_id);

-- FTS全文搜索
CREATE VIRTUAL TABLE conversations_fts USING fts5(
    title, summary, tags,
    content='conversations',
    content_rowid='id'
);

CREATE VIRTUAL TABLE messages_fts USING fts5(
    content_text, content_thinking,
    content='messages',
    content_rowid='id'
);

-- 触发器：自动更新FTS
CREATE TRIGGER conversations_ai AFTER INSERT ON conversations BEGIN
    INSERT INTO conversations_fts(rowid, title, summary, tags)
    VALUES (new.id, new.title, new.summary, new.tags);
END;

CREATE TRIGGER conversations_au AFTER UPDATE ON conversations BEGIN
    INSERT INTO conversations_fts(conversations_fts, rowid, title, summary, tags)
    VALUES ('delete', old.id, old.title, old.summary, old.tags);
    INSERT INTO conversations_fts(rowid, title, summary, tags)
    VALUES (new.id, new.title, new.summary, new.tags);
END;
```

---

## 3. 持久化策略

### 3.1 独立存储路径设计

```typescript
// Echo存储路径配置
interface EchoStoragePaths {
  // 主存储目录（用户可配置）
  base: string;                    // 默认: ~/.echo
  
  // 各级存储路径
  vault: string;                   // ~/.echo/vault - 原始数据
  database: string;                // ~/.echo/db - SQLite数据库
  assets: string;                 // ~/.echo/assets - 可复用资产
  cache: string;                  // ~/.echo/cache - 临时缓存
  logs: string;                   // ~/.echo/logs - 日志文件
  config: string;                 // ~/.echo/config - 配置文件
  exports: string;                // ~/.echo/exports - 导出文件
  backups: string;                // ~/.echo/backups - 自动备份
}

// 路径初始化
class EchoStorageInitializer {
  private defaultPaths: EchoStoragePaths = {
    base: path.join(os.homedir(), '.echo'),
    vault: path.join(os.homedir(), '.echo', 'vault'),
    database: path.join(os.homedir(), '.echo', 'db'),
    assets: path.join(os.homedir(), '.echo', 'assets'),
    cache: path.join(os.homedir(), '.echo', 'cache'),
    logs: path.join(os.homedir(), '.echo', 'logs'),
    config: path.join(os.homedir(), '.echo', 'config'),
    exports: path.join(os.homedir(), '.echo', 'exports'),
    backups: path.join(os.homedir(), '.echo', 'backups')
  };
  
  async initialize(customPath?: string): Promise<EchoStoragePaths> {
    const base = customPath || this.defaultPaths.base;
    
    // 确保所有目录存在
    const paths = {
      base,
      vault: path.join(base, 'vault'),
      database: path.join(base, 'db'),
      assets: path.join(base, 'assets'),
      cache: path.join(base, 'cache'),
      logs: path.join(base, 'logs'),
      config: path.join(base, 'config'),
      exports: path.join(base, 'exports'),
      backups: path.join(base, 'backups')
    };
    
    for (const [key, dir] of Object.entries(paths)) {
      await fs.ensureDir(dir);
      
      // 创建.gitignore保护隐私
      if (key === 'base') {
        await this.createGitignore(dir);
      }
      
      // 创建README说明
      if (key === 'base') {
        await this.createReadme(dir);
      }
    }
    
    // 设置权限（仅用户可访问）
    await this.setPermissions(paths.base, 0o700);
    
    return paths;
  }
  
  private async createGitignore(dir: string): Promise<void> {
    const content = `# Echo - Vibe Coding Memory System
# This directory contains your AI conversation history
# Do not commit to public repositories

*
!.gitignore
!README.md
`;
    await fs.writeFile(path.join(dir, '.gitignore'), content);
  }
  
  private async createReadme(dir: string): Promise<void> {
    const content = `# Echo Storage Directory

This directory contains your Vibe Coding conversation data.

## Structure

- vault/ - Raw conversation backups from AI agents
- db/ - Structured SQLite database
- assets/ - Reusable code snippets and templates
- exports/ - Exported conversation archives
- backups/ - Automatic backups

## Security

This data is personal and sensitive. Keep it secure and private.

## Backup

Regular backups are recommended. Use 'echo backup' command.
`;
    await fs.writeFile(path.join(dir, 'README.md'), content);
  }
}
```

### 3.2 实时备份策略

```typescript
class EchoBackupEngine {
  private backupConfig = {
    // 自动备份策略
    autoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // 每天
    maxBackups: 30,                       // 保留30个备份
    compression: 'zstd',                  // 压缩算法
    
    // 备份触发条件
    triggers: {
      onConversationComplete: true,       // 会话完成时
      onSignificantChange: true,          // 大量数据变更时
      scheduled: '0 2 * * *'              // 每天凌晨2点
    }
  };
  
  async performBackup(type: 'full' | 'incremental'): Promise<BackupResult> {
    const timestamp = Date.now();
    const backupDir = path.join(
      this.paths.backups,
      type === 'full' ? 'full' : 'incremental',
      new Date(timestamp).toISOString().split('T')[0]
    );
    
    await fs.ensureDir(backupDir);
    
    if (type === 'full') {
      // 全量备份：数据库 + vault + assets
      await this.backupDatabase(backupDir);
      await this.backupVault(backupDir);
      await this.backupAssets(backupDir);
    } else {
      // 增量备份：仅变更数据
      const lastBackup = await this.getLastBackupTime();
      await this.backupIncremental(backupDir, lastBackup);
    }
    
    // 压缩
    const archivePath = await this.compressBackup(backupDir);
    
    // 清理旧备份
    await this.cleanupOldBackups();
    
    return {
      path: archivePath,
      size: await this.getFileSize(archivePath),
      timestamp,
      type
    };
  }
  
  async restore(backupPath: string, options: RestoreOptions): Promise<void> {
    // 验证备份完整性
    const isValid = await this.verifyBackup(backupPath);
    if (!isValid) {
      throw new Error('Backup verification failed');
    }
    
    // 创建恢复点（便于回滚）
    await this.createRestorePoint();
    
    // 解压备份
    const tempDir = await this.extractBackup(backupPath);
    
    // 恢复数据
    if (options.restoreDatabase) {
      await this.restoreDatabase(tempDir);
    }
    if (options.restoreVault) {
      await this.restoreVault(tempDir);
    }
    if (options.restoreAssets) {
      await this.restoreAssets(tempDir);
    }
    
    // 清理
    await fs.remove(tempDir);
  }
  
  // 导出为独立归档（可迁移）
  async exportArchive(
    conversationIds: string[],
    format: 'echo' | 'json' | 'markdown'
  ): Promise<string> {
    const exportDir = path.join(
      this.paths.exports,
      `export_${Date.now()}`
    );
    
    await fs.ensureDir(exportDir);
    
    // 收集所有相关数据
    for (const id of conversationIds) {
      const conv = await this.getConversation(id);
      const messages = await this.getMessages(id);
      const files = await this.getFileOperations(id);
      
      // 导出
      await this.exportConversationData(exportDir, conv, messages, files);
    }
    
    // 创建元数据
    await this.exportMetadata(exportDir, {
      exportDate: Date.now(),
      echoVersion: '3.0',
      conversationCount: conversationIds.length
    });
    
    // 压缩为独立归档
    const archivePath = await this.createArchive(exportDir, format);
    
    return archivePath;
  }
}
```

### 3.3 Agent工具删除保护

```typescript
class EchoPersistenceGuard {
  // 监控Agent工具数据目录
  async setupProtection(): Promise<void> {
    // 监控可能的删除操作
    const agentPaths = [
      { platform: 'claude-code', path: '~/.claude' },
      { platform: 'aider', path: '~/.aider' },
      { platform: 'kimi-code', path: '~/.kimi' },
      // ... 其他平台
    ];
    
    for (const { platform, path: agentPath } of agentPaths) {
      // 在Agent数据变更时立即备份到Vault
      const watcher = chokidar.watch(agentPath, {
        persistent: true,
        depth: 2
      });
      
      watcher.on('unlink', async (filePath) => {
        console.warn(`[Echo] Detected file deletion: ${filePath}`);
        // 已经在Vault中有备份，无需额外操作
        // 但记录删除事件
        await this.logDeletionEvent(platform, filePath);
      });
      
      watcher.on('unlinkDir', async (dirPath) => {
        console.warn(`[Echo] WARNING: Agent directory deleted: ${dirPath}`);
        // 发送通知给用户
        await this.notifyUserOfDeletion(platform, dirPath);
      });
    }
  }
  
  // 用户重新安装Agent后的数据恢复
  async recoverAfterReinstall(platform: string): Promise<RecoveryResult> {
    // 1. 从Vault中查找该平台的原始数据
    const vaultFiles = await this.listVaultFiles(platform);
    
    // 2. 检查数据库中是否已有解析记录
    const existingConvos = await this.listConversationsByPlatform(platform);
    
    // 3. 找出未解析的Vault文件
    const unprocessed = vaultFiles.filter(file => 
      !existingConvos.some(c => c.raw_vault_path === file.path)
    );
    
    // 4. 重新解析导入
    const recovered = [];
    for (const file of unprocessed) {
      try {
        const conv = await this.reparseFromVault(file);
        recovered.push(conv);
      } catch (e) {
        console.error(`Failed to recover ${file.path}:`, e);
      }
    }
    
    return {
      platform,
      totalVaultFiles: vaultFiles.length,
      alreadyInDb: existingConvos.length,
      recovered: recovered.length,
      failed: unprocessed.length - recovered.length,
      recoveredIds: recovered.map(c => c.id)
    };
  }
  
  // 定期检查数据完整性
  async verifyIntegrity(): Promise<IntegrityReport> {
    const report: IntegrityReport = {
      checks: [],
      issues: [],
      recommendations: []
    };
    
    // 检查1: Vault文件完整性
    const vaultFiles = await this.listAllVaultFiles();
    for (const file of vaultFiles) {
      const hash = await this.calculateHash(file.path);
      if (hash !== file.storedHash) {
        report.issues.push({
          severity: 'error',
          type: 'vault_corruption',
          message: `Vault file corrupted: ${file.path}`,
          details: { expected: file.storedHash, actual: hash }
        });
      }
    }
    
    // 检查2: 数据库与Vault一致性
    const orphanedDbRecords = await this.findOrphanedDbRecords();
    if (orphanedDbRecords.length > 0) {
      report.issues.push({
        severity: 'warning',
        type: 'orphaned_db_records',
        message: `${orphanedDbRecords.length} DB records without vault files`,
        details: { count: orphanedDbRecords.length }
      });
    }
    
    // 检查3: 未解析的Vault文件
    const unprocessedVault = await this.findUnprocessedVaultFiles();
    if (unprocessedVault.length > 0) {
      report.recommendations.push({
        type: 'parse_pending',
        message: `${unprocessedVault.length} vault files pending parsing`,
        action: 'Run: echo vault parse --pending'
      });
    }
    
    return report;
  }
}
```

---

## 4. 扩展平台支持

### 4.1 多平台适配器架构

```typescript
// 平台适配器注册表
interface PlatformRegistry {
  [platformId: string]: PlatformConfig;
}

const ECHO_PLATFORM_REGISTRY: PlatformRegistry = {
  // 国际平台
  'claude-code': {
    name: 'Claude Code',
    company: 'Anthropic',
    enabled: true,
    adapter: ClaudeCodeAdapter,
    dataPaths: ['~/.claude/projects/**/*.jsonl', '~/.claude/history.jsonl'],
    features: {
      thinking: true,
      toolCalls: true,
      gitIntegration: true,
      fileSnapshots: true
    }
  },
  
  'aider': {
    name: 'Aider',
    company: 'Aider',
    enabled: true,
    adapter: AiderAdapter,
    dataPaths: ['~/.aider/chat.history.md', '.aider.chat.history.md'],
    features: {
      thinking: false,
      toolCalls: true,
      gitIntegration: true,
      editBlocks: true
    }
  },
  
  'cursor': {
    name: 'Cursor',
    company: 'Anysphere',
    enabled: true,
    adapter: CursorAdapter,
    dataPaths: ['~/.cursor/composer/**/state.json', '~/.cursor/tabs/**/chat.json'],
    features: {
      thinking: false,
      composer: true,
      tabHistory: true
    }
  },
  
  'continue-dev': {
    name: 'Continue.dev',
    company: 'Continue',
    enabled: true,
    adapter: ContinueDevAdapter,
    dataPaths: ['~/.continue/sessions/*.json', '~/.continue/config.json'],
    features: {
      multiModel: true,
      openSource: true
    }
  },
  
  // 国内平台
  'kimi-code': {
    name: 'Kimi Code',
    company: 'Moonshot',
    enabled: true,
    adapter: KimiCodeAdapter,
    dataPaths: [
      '~/.kimi/sessions/*.json',
      '~/.kimi/conversations/*.jsonl',
      '~/Library/Application Support/Kimi/Code/sessions/' // macOS
    ],
    features: {
      thinking: true,
      longContext: true,      // Kimi擅长长上下文
      toolCalls: true,
      gitIntegration: true
    },
    locale: 'zh-CN'
  },
  
  'tongyi-code': {
    name: '通义灵码',
    company: 'Alibaba',
    enabled: true,
    adapter: TongyiCodeAdapter,
    dataPaths: [
      '~/.tongyi/sessions/',
      '~/Library/Application Support/Tongyi/Code/' // macOS
    ],
    features: {
      thinking: false,
      alibabaEcosystem: true
    },
    locale: 'zh-CN'
  },
  
  'codegeex': {
    name: 'CodeGeeX',
    company: 'Zhipu',
    enabled: true,
    adapter: CodeGeeXAdapter,
    dataPaths: [
      '~/.codegeex/sessions/',
      '~/.vscode/extensions/codegeex/' // VS Code插件数据
    ],
    features: {
      thinking: false,
      vsCodeIntegration: true
    },
    locale: 'zh-CN'
  },
  
  'baidu-comate': {
    name: '百度Comate',
    company: 'Baidu',
    enabled: false, // 待开发
    adapter: null,
    dataPaths: [],
    features: {},
    locale: 'zh-CN'
  },
  
  // 终端工具
  'warp': {
    name: 'Warp',
    company: 'Warp',
    enabled: false, // 待开发
    adapter: null,
    dataPaths: ['~/.warp/ai_sessions/'],
    features: {
      terminalNative: true
    }
  },
  
  'zed': {
    name: 'Zed AI',
    company: 'Zed',
    enabled: false, // 待开发
    adapter: null,
    dataPaths: ['~/.zed/ai/'],
    features: {
      collaborative: true
    }
  }
};

// Kimi Code适配器详细实现
class KimiCodeAdapter implements AgentAdapter {
  readonly name = 'Kimi Code';
  readonly version = '1.0';
  
  // Kimi Code数据格式可能与Claude Code类似但有自己的特点
  async parseIncremental(filePath: string, position: number): Promise<ParseResult> {
    const newContent = await readFileFromPosition(filePath, position);
    const lines = newContent.trim().split('\n');
    
    const messages: Partial<EchoMessage>[] = [];
    
    for (const line of lines) {
      try {
        const raw = JSON.parse(line);
        
        // Kimi可能有不同的字段命名
        messages.push({
          role: this.mapRole(raw.role || raw.type),
          type: this.detectMessageType(raw),
          content: {
            text: raw.content || raw.message,
            // Kimi也可能有推理过程
            thinking: raw.thinking || raw.reasoning,
            toolName: raw.tool?.name,
            toolInput: raw.tool?.input,
            codeBlocks: this.extractCodeBlocks(raw.content)
          },
          // Kimi支持超长上下文，可能有特殊的上下文管理
          context: {
            timestamp: new Date(raw.timestamp || raw.created_at).getTime(),
            cwd: raw.workspace_path || raw.cwd,
            // Kimi可能有上下文窗口使用情况
            contextWindowUsed: raw.context_window_used,
            contextWindowTotal: raw.context_window_total
          }
        });
      } catch (e) {
        console.error(`[KimiCodeAdapter] Failed to parse: ${line.slice(0, 100)}`);
      }
    }
    
    return {
      messages,
      newPosition: position + newContent.length
    };
  }
  
  // Kimi特有：长上下文管理
  async extractLongContextFeatures(raw: any): Promise<LongContextFeatures> {
    return {
      // Kimi擅长处理超长上下文，可能需要特殊处理
      contextWindowSize: raw.context_window_total || 200000,
      contextUtilization: raw.context_window_used / raw.context_window_total,
      // 可能存在上下文压缩策略
      compressionStrategy: raw.compression_strategy,
      // 关键信息保留
      keyPointsPreserved: raw.key_points || []
    };
  }
  
  // 注入上下文的特殊处理（考虑Kimi的长上下文优势）
  async injectContext(pack: ContextPack, target: InjectionTarget): Promise<InjectResult> {
    // Kimi可以处理更大的上下文，可以使用更详细的注入
    const optimizedPack = await this.optimizeForLongContext(pack);
    
    // Kimi可能有特定的上下文格式
    const kimiFormat = this.convertToKimiFormat(optimizedPack);
    
    // 写入Kimi可读取的位置
    const injectPath = path.join('~/.kimi/contexts', `${pack.echoId}.json`);
    await fs.writeFile(injectPath, JSON.stringify(kimiFormat, null, 2));
    
    return {
      success: true,
      message: `Context ready for Kimi Code. Use /load-context ${pack.echoId}`,
      injectedTokens: kimiFormat.tokenCount
    };
  }
}
```

### 4.2 平台自动检测

```typescript
class EchoPlatformDetector {
  async detectInstalledPlatforms(): Promise<DetectedPlatform[]> {
    const detected: DetectedPlatform[] = [];
    
    for (const [id, config] of Object.entries(ECHO_PLATFORM_REGISTRY)) {
      if (!config.enabled) continue;
      
      const detection = await this.detectPlatform(id, config);
      if (detection.installed) {
        detected.push({
          id,
          name: config.name,
          version: detection.version,
          dataPath: detection.dataPath,
          lastActivity: detection.lastActivity,
          conversationCount: detection.conversationCount
        });
      }
    }
    
    return detected;
  }
  
  private async detectPlatform(id: string, config: PlatformConfig): Promise<DetectionResult> {
    // 多维度检测
    
    // 1. 检查命令是否存在
    const commandExists = await this.checkCommand(id);
    
    // 2. 检查数据目录
    let dataPath: string | null = null;
    for (const pattern of config.dataPaths) {
      const expanded = expandHomeDir(pattern);
      if (await fs.pathExists(expanded)) {
        dataPath = expanded;
        break;
      }
    }
    
    // 3. 检查进程是否在运行
    const isRunning = await this.checkProcess(id);
    
    // 4. 获取版本信息
    const version = commandExists ? await this.getVersion(id) : null;
    
    // 5. 统计现有数据
    const conversationCount = dataPath ? await this.countConversations(dataPath) : 0;
    const lastActivity = dataPath ? await this.getLastActivity(dataPath) : null;
    
    return {
      installed: commandExists || !!dataPath,
      version,
      dataPath,
      isRunning,
      conversationCount,
      lastActivity
    };
  }
  
  // 初始化界面显示检测结果
  async generateOnboardingReport(): Promise<OnboardingReport> {
    const detected = await this.detectInstalledPlatforms();
    
    return {
      summary: {
        totalDetected: detected.length,
        withData: detected.filter(p => p.conversationCount > 0).length,
        totalConversations: detected.reduce((sum, p) => sum + p.conversationCount, 0)
      },
      platforms: detected,
      recommendations: this.generateRecommendations(detected)
    };
  }
}
```

---

## 5. 数据生命周期管理

### 5.1 数据保留策略

```typescript
interface DataRetentionPolicy {
  // 原始数据（Vault）：永久保留
  vault: {
    retention: 'forever';
    compression: 'gzip' | 'zstd';
    compressionAfter: 30 * 24 * 60 * 60 * 1000; // 30天后压缩
  };
  
  // 结构化数据：默认永久，可配置
  database: {
    retention: 'configurable';
    defaultRetention: 'forever';
    archiveAfter: 365 * 24 * 60 * 60 * 1000; // 1年后归档
  };
  
  // 缓存数据：定期清理
  cache: {
    retention: 'temporary';
    maxAge: 7 * 24 * 60 * 60 * 1000; // 7天
    maxSize: 1024 * 1024 * 1024; // 1GB
  };
  
  // 日志数据：滚动保留
  logs: {
    retention: 'rolling';
    maxFiles: 10;
    maxSizePerFile: 100 * 1024 * 1024; // 100MB
  };
}

class EchoDataLifecycleManager {
  async enforceRetentionPolicy(): Promise<LifecycleReport> {
    const report: LifecycleReport = {
      actions: [],
      spaceReclaimed: 0
    };
    
    // 1. 压缩旧Vault文件
    const oldVaultFiles = await this.findOldVaultFiles(30);
    for (const file of oldVaultFiles) {
      if (!file.compressed) {
        const originalSize = await this.getFileSize(file.path);
        await this.compressVaultFile(file);
        const newSize = await this.getFileSize(file.path + '.zst');
        report.spaceReclaimed += originalSize - newSize;
        report.actions.push({ type: 'compress', file: file.path });
      }
    }
    
    // 2. 清理缓存
    const cacheStats = await this.cleanupCache();
    report.spaceReclaimed += cacheStats.reclaimed;
    report.actions.push({ type: 'cleanup_cache', ...cacheStats });
    
    // 3. 归档旧会话
    const oldConversations = await this.findConversationsForArchiving(365);
    for (const conv of oldConversations) {
      await this.archiveConversation(conv);
      report.actions.push({ type: 'archive', conversationId: conv.id });
    }
    
    // 4. 滚动日志
    const logStats = await this.rolloverLogs();
    report.actions.push({ type: 'rollover_logs', ...logStats });
    
    return report;
  }
}
```

### 5.2 数据导出与迁移

```typescript
class EchoDataExporter {
  // 导出为可移植格式
  async exportPortable(
    options: PortableExportOptions
  ): Promise<PortableExportResult> {
    const exportId = generateUUID();
    const exportDir = path.join(this.paths.exports, exportId);
    await fs.ensureDir(exportDir);
    
    // 1. 导出元数据
    const metadata: ExportMetadata = {
      version: '3.0',
      exportId,
      exportDate: Date.now(),
      echoVersion: '3.0',
      platforms: options.platforms || 'all',
      conversationCount: 0,
      compression: options.compression || 'zstd'
    };
    
    // 2. 导出Vault数据
    if (options.includeVault) {
      await this.exportVaultData(exportDir, options);
      metadata.includesVault = true;
    }
    
    // 3. 导出数据库
    if (options.includeDatabase) {
      await this.exportDatabase(exportDir, options);
      metadata.includesDatabase = true;
    }
    
    // 4. 导出资产
    if (options.includeAssets) {
      await this.exportAssets(exportDir, options);
      metadata.includesAssets = true;
    }
    
    // 5. 创建索引
    await fs.writeFile(
      path.join(exportDir, 'echo-export.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // 6. 打包
    const archivePath = await this.createPortableArchive(exportDir, metadata);
    
    return {
      exportId,
      archivePath,
      size: await this.getFileSize(archivePath),
      metadata
    };
  }
  
  // 从其他工具导入
  async importFromOtherTool(
    sourceTool: 'cline' | 'supermaven' | 'codesnap',
    sourcePath: string
  ): Promise<ImportResult> {
    const importer = this.getImporter(sourceTool);
    
    // 1. 扫描源数据
    const sourceData = await importer.scan(sourcePath);
    
    // 2. 转换格式
    const echoFormat = await importer.convert(sourceData);
    
    // 3. 导入到Vault（保留原始）
    for (const item of echoFormat) {
      await this.importToVault(item);
    }
    
    // 4. 解析到数据库
    for (const item of echoFormat) {
      await this.parseAndStore(item);
    }
    
    return {
      source: sourceTool,
      imported: echoFormat.length,
      failed: 0
    };
  }
}
```

---

## 6. 技术实现细节

### 6.1 性能优化

```typescript
class EchoPerformanceOptimizer {
  // 批量插入优化
  async batchInsertMessages(messages: EchoMessage[]): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      await this.db.transaction(async (trx) => {
        // 使用预处理语句
        const stmt = trx.prepare(`
          INSERT INTO messages (id, echo_id, conversation_id, ...)
          VALUES (?, ?, ?, ...)
        `);
        
        for (const msg of batch) {
          stmt.run(...this.extractValues(msg));
        }
        
        stmt.finalize();
      });
    }
  }
  
  // 向量索引优化（使用HNSW）
  async createOptimizedVectorIndex(): Promise<void> {
    // 使用sqlite-vss或类似的向量扩展
    await this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vss_embeddings USING vss0(
        embedding(384),
        factory="HNSW32"
      );
    `);
  }
  
  // 查询缓存
  private queryCache = new LRUCache({
    max: 1000,
    ttl: 5 * 60 * 1000 // 5分钟
  });
  
  async cachedQuery<T>(sql: string, params: any[]): Promise<T> {
    const key = `${sql}:${JSON.stringify(params)}`;
    
    const cached = this.queryCache.get(key);
    if (cached) return cached as T;
    
    const result = await this.db.all(sql, params);
    this.queryCache.set(key, result);
    
    return result;
  }
}
```

### 6.2 安全与隐私

```typescript
class EchoSecurityManager {
  // 数据加密
  private encryptionKey: Buffer;
  
  async initializeEncryption(): Promise<void> {
    const keyPath = path.join(this.paths.config, '.key');
    
    if (await fs.pathExists(keyPath)) {
      // 读取现有密钥
      const encryptedKey = await fs.readFile(keyPath);
      this.encryptionKey = await this.decryptKey(encryptedKey);
    } else {
      // 生成新密钥
      this.encryptionKey = crypto.randomBytes(32);
      const encryptedKey = await this.encryptKey(this.encryptionKey);
      await fs.writeFile(keyPath, encryptedKey, { mode: 0o600 });
    }
  }
  
  // 加密敏感数据
  encryptSensitive(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  // 隐私模式：自动检测和脱敏
  async sanitizeForPrivacy(content: string): Promise<string> {
    // 检测敏感信息
    const patterns = [
      { type: 'api_key', regex: /sk-[a-zA-Z0-9]{48}/g, replace: '[API_KEY]' },
      { type: 'password', regex: /password[:\s]+["']?[^\s"']+["']?/gi, replace: 'password: [REDACTED]' },
      { type: 'email', regex: /[\w.-]+@[\w.-]+\.\w+/g, replace: '[EMAIL]' },
      { type: 'ip', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replace: '[IP]' }
    ];
    
    let sanitized = content;
    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern.regex, pattern.replace);
    }
    
    return sanitized;
  }
}
```

---

**Echo v3.0** - *Your AI conversations, echoing forever, securely preserved*
