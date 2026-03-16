# VESTI Terminal/CLI 版本开发提案

**版本**: v1.0  
**日期**: 2026年3月10日  
**目标**: 分析VESTI终端版本的可行性和实施方案

---

## 执行摘要

**结论**: ✅ **强烈推荐开发CLI版本**

VESTI开发终端版本不仅可行，而且具有战略价值：
- 技术可行性: ⭐⭐⭐⭐⭐ (核心逻辑可复用90%+)
- 市场需求: ⭐⭐⭐⭐☆ (开发者用户强烈需求)
- 差异化价值: ⭐⭐⭐⭐⭐ (竞品无类似方案)
- 开发成本: ⭐⭐⭐☆☆ (中等，2-4人月)

---

## 一、为什么需要终端版本？

### 1.1 目标用户群体

**核心用户**: 开发者、DevOps工程师、技术写作者

**他们的特点**:
- 日常在终端工作，浏览器只是工具之一
- 偏好键盘操作，厌恶鼠标点击
- 需要将AI对话集成到现有工具链
- 有自动化和脚本化需求

**典型使用场景**:

```bash
# 场景1: 快速导出昨晚的ChatGPT对话
vesti export --platform chatgpt --since "yesterday" --format markdown \
  --output ~/notes/ai-chats/$(date +%Y-%m-%d).md

# 场景2: 在Vim中直接搜索历史对话
:read !vesti search "docker compose best practices" --limit 5

# 场景3: CI/CD流水线自动备份
echo "${OPENAI_API_KEY}" | vesti sync --auto --format json \
  --output ./backups/conversations-$(date +%s).json

# 场景4: 与Obsidian集成，自动导入
vesti export --since "1 week ago" --format obsidian \
  --vault ~/obsidian-vault/AI-Chats/

# 场景5: 快速查看今日对话统计
vesti stats --today --platform all
```

### 1.2 市场机会

**现有痛点的命令行解决方案**:

| 痛点 | 现有方案 | VESTI CLI优势 |
|-----|---------|--------------|
| 导出ChatGPT对话 | 手动复制或等24小时 | 秒级导出，支持多种格式 |
| 搜索历史对话 | 浏览器里翻找 | 命令行快速搜索，支持正则 |
| 备份对话 | 无 | 自动化脚本，定时备份 |
| 整理到笔记系统 | 手动复制粘贴 | 直接输出到Obsidian/Notion |
| 多平台管理 | 分别登录各平台 | 一个命令管理所有平台 |

**竞品分析**:
- ChatGPT Toolbox: 只有浏览器扩展，无CLI
- Mem0: 云服务，无本地CLI
- 开源脚本: 功能零散，不稳定
- **VESTI CLI将是市场唯一**: 本地优先 + 跨平台 + 专业CLI工具

---

## 二、技术可行性分析

### 2.1 架构复用评估

```
VESTI 浏览器扩展架构:
┌─────────────────────────────────────────┐
│  UI Layer (React + Sidepanel)            │  ← 需重写为CLI
├─────────────────────────────────────────┤
│  Service Layer                           │  ← 90%可复用
│  ├── CompressionService (PACS)          │  ← 100%可复用
│  ├── StorageService                     │  ← 需适配SQLite
│  └── ExportService                      │  ← 95%可复用
├─────────────────────────────────────────┤
│  Core Layer                              │  ← 100%可复用
│  ├── SemanticChunker                    │  ← 100%可复用
│  ├── HierarchicalSummarizer             │  ← 100%可复用
│  ├── QualityGate                        │  ← 100%可复用
│  └── TextCleaner                        │  ← 100%可复用
├─────────────────────────────────────────┤
│  Platform Adapters                       │  ← 80%可复用
│  ├── ChatGPT Adapter                    │  ← 需无头浏览器
│  ├── Claude Adapter                     │  ← 需无头浏览器
│  └── ...                                │
├─────────────────────────────────────────┤
│  Storage Layer                           │  ← 需重写
│  └── IndexedDB (browser)                │  → SQLite (CLI)
└─────────────────────────────────────────┘
```

**代码复用率估算**:
- 核心压缩逻辑: 100% (约4000行)
- 导出序列化: 95% (约500行)
- 平台适配器: 80% (需重写DOM交互部分)
- 存储层: 需重写 (IndexedDB → SQLite)
- UI层: 完全重写 (React → CLI框架)

### 2.2 技术栈选择

**方案A: Node.js + TypeScript (推荐)**

优势:
- 与现有代码库语言一致
- 最大代码复用
- 丰富的npm生态
- 跨平台支持好

技术选型:
- **CLI框架**: [oclif](https://oclif.io/) 或 [commander.js](https://github.com/tj/commander.js)
- **TUI (可选)**: [ink](https://github.com/vadimdemedes/ink) (React for CLI) 或 [blessed](https://github.com/chjj/blessed)
- **数据库**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **无头浏览器**: [puppeteer](https://github.com/puppeteer/puppeteer) 或 [playwright](https://github.com/microsoft/playwright)
- **配置管理**: [conf](https://github.com/sindresorhus/conf)

**方案B: Python**

优势:
- 数据科学/AI领域更流行
- 丰富的CLI工具生态
- 某些开发者更熟悉

劣势:
- 需要重写所有TypeScript代码
- 维护两套代码库

**方案C: Rust**

优势:
- 性能极佳
- 单二进制分发
- 现代系统编程语言

劣势:
- 学习曲线陡峭
- 开发速度慢
- 生态不如Node.js丰富

**推荐**: 方案A (Node.js)，最大化代码复用和开发效率

### 2.3 数据存储方案

**浏览器版**: IndexedDB (浏览器内置)

**CLI版**: SQLite (本地文件)

**Schema兼容**:
```typescript
// 复用现有的TypeScript类型定义
// 使用TypeORM或Prisma作为ORM层
// 支持数据库迁移

// 示例结构
~/.vesti/
├── config.json          # 配置
├── vesti.db             # SQLite数据库
├── cache/               # 压缩缓存
│   └── *.json
└── exports/             # 导出文件默认位置
    └── 2026/
```

### 2.4 平台捕获方案

**挑战**: CLI没有浏览器环境，如何捕获对话？

**方案1: 无头浏览器 (推荐)**
```typescript
// 使用Playwright/Puppeteer
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://chat.openai.com');
// 自动登录或读取cookie
// 执行与浏览器扩展相同的DOM解析逻辑
```

**方案2: API逆向**
- 分析各平台的私有API
- 使用用户的auth token直接调用
- 风险: 可能违反ToS，API变动

**方案3: 浏览器扩展桥接**
- 浏览器扩展捕获数据
- 通过本地WebSocket/HTTP服务传给CLI
- CLI作为服务端，浏览器扩展作为客户端

**推荐方案**: 方案1 (无头浏览器) 作为主方案，方案3作为备选

---

## 三、功能设计

### 3.1 CLI命令结构

```bash
vesti --help
# VESTI CLI - AI Conversation Manager
# 
# USAGE
#   $ vesti [COMMAND]
#
# TOPICS
#   config    Manage configuration
#   platform  Manage connected platforms
#
# COMMANDS
#   capture   Capture new conversations
#   export    Export conversations
#   import    Import conversations
#   init      Initialize VESTI
#   list      List conversations
#   search    Search conversations
#   stats     Show statistics
#   sync      Sync with platforms
#   version   Show version
```

### 3.2 核心命令详细设计

#### `vesti init` - 初始化

```bash
vesti init
# ? Where should VESTI store data? (~/.vesti)
# ? Select platforms to connect:
#   [x] ChatGPT
#   [x] Claude
#   [ ] Gemini
#   [ ] DeepSeek
# ? Authentication method:
#   > Interactive login (opens browser)
#     Manual cookie paste
#     Import from browser extension
```

#### `vesti capture` - 捕获对话

```bash
# 捕获特定平台的新对话
vesti capture --platform chatgpt

# 捕获所有平台
vesti capture --all

# 后台持续监控
vesti capture --watch --interval 60

# 捕获特定会话
vesti capture --platform chatgpt --url "https://chat.openai.com/c/xxxx"
```

#### `vesti export` - 导出

```bash
# 导出最近的对话
vesti export --since "2 days ago" --format markdown

# 导出特定对话
vesti export --id 12345 --format json

# 导出并压缩
vesti export --since "1 week ago" --compress --level hierarchical

# 导出到Obsidian
vesti export --platform all --format obsidian --vault ~/obsidian/

# 批量导出所有ChatGPT对话
vesti export --platform chatgpt --all --format markdown \
  --output ./exports/chatgpt/{date}/{title}.md
```

#### `vesti search` - 搜索

```bash
# 全文搜索
vesti search "docker best practices"

# 高级搜索
vesti search "machine learning" --platform claude \
  --since "2026-01-01" --format json | jq '.[].title'

# 交互式搜索 (fzf风格)
vesti search --interactive

# 搜索并直接导出
vesti search "API design" --export --format markdown
```

#### `vesti list` - 列表

```bash
# 列出最近对话
vesti list --limit 20

# 按平台筛选
vesti list --platform chatgpt --since "yesterday"

# 表格格式
vesti list --format table

# 仅显示标题
vesti list --format plain --no-header | fzf
```

#### `vesti stats` - 统计

```bash
# 总体统计
vesti stats

# 平台分布
vesti stats --by-platform

# 时间趋势
vesti stats --daily --last-30-days

# 导出统计报告
vesti stats --format json > stats.json
```

#### `vesti sync` - 同步

```bash
# 同步所有平台
vesti sync

# 增量同步
vesti sync --incremental

# 自动同步 (配合cron)
vesti sync --auto --quiet
```

### 3.3 配置文件

```yaml
# ~/.vesti/config.yaml
version: "1.0"

# 存储配置
storage:
  path: "~/.vesti"
  database: "vesti.db"
  cache_enabled: true
  compression_enabled: true

# 平台配置
platforms:
  chatgpt:
    enabled: true
    auth_method: "cookie"  # cookie / oauth / session
    auto_capture: true
    
  claude:
    enabled: true
    auth_method: "cookie"
    auto_capture: true
    
  gemini:
    enabled: false
    
# 导出默认设置
export:
  default_format: "markdown"
  default_output: "~/vesti-exports"
  auto_compress: false
  compression_level: "hierarchical"  # semantic / hierarchical / knowledge
  
# PACS配置
pacs:
  cache_enabled: true
  cache_size: 1000
  quality_gate: true
  
# 集成配置
integrations:
  obsidian:
    vault_path: "~/obsidian-vault"
    auto_import: false
    
  notion:
    api_key: "${NOTION_API_KEY}"
    database_id: "..."
```

### 3.4 TUI模式 (可选增强)

使用[ink](https://github.com/vadimdemedes/ink)提供交互式界面:

```bash
vesti tui
# 启动交互式界面

# 界面包含:
# - 对话列表 (可滚动、搜索)
# - 实时预览
# - 批量选择导出
# - 统计图表
# - 设置面板
```

---

## 四、与浏览器扩展的协同

### 4.1 数据同步方案

**方案1: 共享数据库文件**
- 浏览器扩展和CLI共享同一个SQLite文件
- 浏览器通过[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)访问
- 简单但不支持同时访问

**方案2: 本地服务桥接**
- CLI启动本地HTTP服务
- 浏览器扩展通过HTTP API通信
- 支持实时同步

**方案3: 导入/导出桥接**
- 浏览器扩展导出备份文件
- CLI导入备份文件
- 最简单，延迟较大

**推荐**: 方案2 (本地服务桥接)，实时性和灵活性最佳

### 4.2 功能分工建议

| 功能 | 浏览器扩展 | CLI | 说明 |
|-----|-----------|-----|------|
| 实时捕获 | ✅ | ❌ | 浏览器天然优势 |
| 查看/搜索 | ✅ | ✅ | 两者都支持 |
| 批量导出 | ⚠️ | ✅ | CLI更适合批量操作 |
| 自动化备份 | ❌ | ✅ | CLI配合cron |
| 与编辑器集成 | ❌ | ✅ | CLI管道操作 |
| 高级分析 | ⚠️ | ✅ | CLI计算资源更丰富 |

### 4.3 用户引导策略

**新用户路径**:
1. 先安装浏览器扩展（易上手）
2. 数据积累后，安装CLI（高级功能）
3. 提供迁移工具将浏览器数据导入CLI

**推广语**:
> "浏览器扩展帮你收集，CLI帮你释放数据价值"

---

## 五、开发路线图

### Phase 1: MVP (4-6周)

**目标**: 核心功能可用

**功能**:
- [ ] 基础CLI框架
- [ ] SQLite存储层
- [ ] ChatGPT捕获 (Playwright)
- [ ] 基础导出功能 (Markdown/JSON)
- [ ] 全文搜索

**团队**: 1-2人

### Phase 2: 多平台支持 (3-4周)

**目标**: 支持主流AI平台

**功能**:
- [ ] Claude捕获
- [ ] Gemini捕获
- [ ] 增量同步
- [ ] 高级导出选项
- [ ] 配置文件管理

### Phase 3: PACS集成 (3-4周)

**目标**: 复用浏览器版的PACS能力

**功能**:
- [ ] 语义分块 (Tier 1)
- [ ] 分层摘要 (Tier 2)
- [ ] 智能压缩导出
- [ ] 缓存系统
- [ ] 质量评估

### Phase 4: 高级功能 (4-6周)

**目标**: 生产力工具集成

**功能**:
- [ ] Obsidian集成
- [ ] Notion集成
- [ ] TUI界面
- [ ] 统计分析
- [ ] 自动化脚本示例

### Phase 5: 生态建设 (持续)

- [ ] 开源发布
- [ ] 社区贡献指南
- [ ] 插件系统
- [ ] CI/CD集成示例
- [ ] 与流行工具集成 (Raycast, Alfred等)

---

## 六、商业模式

### 6.1 与浏览器版的关系

**免费开源策略**:
- CLI完全开源免费
- 作为浏览器扩展的营销渠道
- 社区贡献反哺核心功能

**Pro功能**:
- 高级PACS功能 (Tier 3知识图谱)
- 企业级集成 (SSO, 团队共享)
- 优先支持

### 6.2 获客价值

**开发者社区影响力**:
- GitHub trending
- Hacker News曝光
- 技术博客传播
- 间接推广浏览器扩展

**生态系统效应**:
```
CLI用户 (开发者) 
  ↓ 工作场景使用
  ↓ 推荐给团队
  ↓ 团队需要协作功能
  ↓ 购买Pro/Team版本
```

---

## 七、风险与挑战

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 无头浏览器检测 | 高 | 使用 stealth 插件，模拟真实浏览器 |
| 平台API变动 | 中 | 建立监控，快速适配 |
| 跨平台差异 | 中 | 抽象平台适配层 |

### 7.2 法律风险

- **ToS合规**: 明确告知用户自行承担风险
- **数据隐私**: 纯本地存储，不上传云端
- **开源许可**: 选择合适的开源协议 (MIT/Apache 2.0)

### 7.3 维护成本

- 需要持续跟进各平台变化
- 需要维护两套产品 (浏览器+CLI)
- 建议: 核心逻辑共享，减少重复工作

---

## 八、结论与建议

### 8.1 推荐决策

**强烈推荐开发CLI版本**:

✅ **技术可行**: 90%+代码可复用  
✅ **市场需求**: 开发者强烈需求  
✅ **差异化**: 市场空白  
✅ **战略价值**: 提升品牌影响力，反哺浏览器版  
✅ **成本可控**: 2-4人月可出MVP  

### 8.2 实施建议

1. **立即启动**: 在浏览器版稳定后，立即启动CLI开发
2. **技术选型**: Node.js + oclif + Playwright
3. **开源策略**: 完全开源，建立社区
4. **渐进发布**: MVP → 多平台 → PACS → 生态
5. **协同推广**: CLI作为浏览器版的引流工具

### 8.3 预期收益

- **开发者用户**: 预计吸引1-5万开发者用户
- **品牌提升**: 在开发者社区建立专业形象
- **产品护城河**: 形成浏览器+CLI+服务的生态壁垒
- **商业转化**: 预计10-20% CLI用户转化为Pro付费

---

**VESTI CLI将是AI对话管理领域的第一个专业级CLI工具，填补市场空白，建立技术领导地位。**
