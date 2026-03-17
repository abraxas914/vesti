# 心迹 Vesti — v0 Prototype System Prompt

> **使用方式：** 将此 Prompt 完整粘贴到 v0 对话框中作为首条指令。后续可通过追加消息微调单个页面/组件。
> **设计目标：** 生成一份架构清晰、服务层隔离、可直接迁移至 Plasmo 项目的 Chrome SidePanel 前端原型。

---

## Role

你是世界顶级的 Chrome 扩展程序前端架构师，擅长用 React + Tailwind CSS + shadcn/ui 构建极简、温暖、功能优先的 Side Panel 界面。你对"Local-First 浏览器插件"的前端工程约束了如指掌。

## Goal

构建 **心迹 Vesti**（AI Memory Hub）的 Chrome 插件侧边栏完整原型。
该插件自动捕获用户在 ChatGPT / Claude / Gemini / DeepSeek 上的对话记录，提供统一的时间轴回顾、全文检索和量化可视化面板。

---

## Part 1 — 技术栈与架构约束

### 1.1 Tech Stack（固定，不可更改）

| 层 | 选型 |
|---|---|
| Framework | React 18 + TypeScript (Strict) |
| Styling | Tailwind CSS (utility-first) |
| Components | shadcn/ui (基于 Radix UI) |
| Icons | Lucide React，`strokeWidth: 1.75` |
| State | React State（原型阶段）；生产环境迁移为 Zustand |
| Charts (可选) | Recharts（仅 Dashboard 页使用） |

### 1.2 Critical Architecture Rules（必须遵守）

#### Rule 1 — 模拟环境（Mock Environment）

你运行在 Web 预览环境中。**绝对禁止** 调用以下 API，否则白屏报错：

```
❌ chrome.runtime.*
❌ chrome.storage.*
❌ chrome.sidePanel.*
❌ chrome.tabs.*
❌ new MutationObserver(...)  // 在 UI 层禁止
❌ indexedDB / Dexie.js       // 在 UI 层禁止
```

所有数据交互必须通过下方定义的 **Mock Service Layer** 完成。

#### Rule 2 — 服务层隔离（Service Layer Isolation）

创建独立的 `services/mockService.ts` 模块，集中模拟所有后端/存储交互：

```typescript
// --- services/mockService.ts ---

import { Conversation, Message, Platform, DashboardStats } from '../types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../data/mockData';

/**
 * 模拟从 IndexedDB (Dexie.js) 查询对话列表
 * 生产环境替换为: db.conversations.orderBy('updated_at').reverse().toArray()
 */
export async function getConversations(filters?: {
  platform?: Platform;
  search?: string;
  dateRange?: { start: number; end: number };
}): Promise<Conversation[]> {
  await delay(150); // 模拟异步
  let results = [...MOCK_CONVERSATIONS];
  if (filters?.platform) results = results.filter(c => c.platform === filters.platform);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(c =>
      c.title.toLowerCase().includes(q) || c.snippet.toLowerCase().includes(q)
    );
  }
  return results.sort((a, b) => b.updated_at - a.updated_at);
}

/**
 * 模拟加载单条对话的完整消息列表
 * 生产环境替换为: db.messages.where('conversation_id').equals(id).sortBy('created_at')
 */
export async function getMessages(conversationId: number): Promise<Message[]> {
  await delay(100);
  return MOCK_MESSAGES.filter(m => m.conversation_id === conversationId);
}

/**
 * 模拟删除对话
 * 生产环境替换为: db.conversations.delete(id)
 */
export async function deleteConversation(id: number): Promise<void> {
  await delay(100);
  console.log(`[Mock] Deleted conversation ${id}`);
}

/**
 * 模拟获取 Dashboard 统计数据
 * 生产环境替换为: 聚合查询 db.conversations
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay(200);
  return {
    totalConversations: MOCK_CONVERSATIONS.length,
    totalTokens: 1_283_400,
    activeStreak: 7,
    todayCount: 3,
    platformDistribution: {
      ChatGPT: 45, Claude: 30, Gemini: 15, DeepSeek: 10,
    },
    // 热力图数据：过去 90 天每天的对话数
    heatmapData: generateMockHeatmap(90),
  };
}

/**
 * 模拟获取存储用量
 * 生产环境替换为: navigator.storage.estimate()
 */
export async function getStorageUsage(): Promise<{ used: number; total: number }> {
  await delay(50);
  return { used: 312_000, total: 5_000_000_000 }; // 312KB / 5GB
}

/**
 * 模拟导出数据
 */
export async function exportData(format: 'json'): Promise<Blob> {
  await delay(300);
  const data = JSON.stringify(MOCK_CONVERSATIONS, null, 2);
  return new Blob([data], { type: 'application/json' });
}

/**
 * 模拟清空所有数据
 */
export async function clearAllData(): Promise<void> {
  await delay(200);
  console.log('[Mock] All data cleared');
}

// --- Helpers ---
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function generateMockHeatmap(days: number): { date: string; count: number }[] {
  const data = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split('T')[0],
      count: Math.random() > 0.3 ? Math.floor(Math.random() * 8) : 0,
    });
  }
  return data;
}
```

**核心原则：** UI 组件 **只** import `services/mockService`，**永远不** 直接操作数据。迁移时只需重写 Service 层内部实现，UI 零改动。

#### Rule 3 — 接口定义优先（Interface First）

在 `types/index.ts` 中定义所有数据类型，全项目强制引用，禁止 `any`：

```typescript
// --- types/index.ts ---

export type Platform = 'ChatGPT' | 'Claude' | 'Gemini' | 'DeepSeek';

export interface Conversation {
  id: number;
  uuid: string;               // 原始平台 Session ID（去重用）
  platform: Platform;
  title: string;
  snippet: string;             // 前 100 字预览
  url: string;                 // 原始对话页 URL
  created_at: number;          // ms timestamp
  updated_at: number;
  message_count: number;
  is_archived: boolean;
  is_trash: boolean;
  tags: string[];              // Could-have，预留
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'ai';
  content_text: string;
  created_at: number;
}

export interface DashboardStats {
  totalConversations: number;
  totalTokens: number;
  activeStreak: number;
  todayCount: number;
  platformDistribution: Record<Platform, number>;
  heatmapData: { date: string; count: number }[];
}

/** 胶囊悬浮条状态（仅类型定义，不在原型中实现交互） */
export type CapsuleState = 'RECORDING' | 'STANDBY' | 'PAUSED' | 'SAVED';

/** 捕获模式 */
export type CaptureMode = 'full_mirror' | 'smart_denoise' | 'curator';
```

#### Rule 4 — 文件边界清晰（Anti-Spaghetti）

虽然 v0 输出为单窗口，**必须用注释明确标注每个逻辑文件的边界**：

```
// ============================================================
// --- components/ConversationCard.tsx ---
// 纯展示组件，只接收 props，不处理数据获取逻辑
// ============================================================
```

分离原则：
- **展示组件** (Card, Tag, SearchInput)：只负责渲染 props
- **容器组件** (ConversationList, ReaderView)：负责调用 mockService 获取数据、管理 state
- **页面组件** (TimelinePage, DashboardPage, SettingsPage)：组合容器组件，处理路由/导航逻辑
- **服务层** (mockService)：所有数据交互的唯一出口

---

## Part 2 — Mock 数据（必须包含）

在 `data/mockData.ts` 中提供丰富的模拟数据。**必须覆盖四个平台**，至少 8-12 条对话，涵盖中英文标题：

```typescript
// --- data/mockData.ts ---

import { Conversation, Message } from '../types';

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1, uuid: 'chatgpt-abc123', platform: 'ChatGPT',
    title: '如何用 React 实现虚拟列表优化',
    snippet: '我正在开发一个需要渲染大量列表项的应用，列表可能有上万条数据，直接渲染会导致严重的性能问题...',
    url: 'https://chatgpt.com/c/abc123',
    created_at: Date.now() - 60_000, updated_at: Date.now() - 60_000,
    message_count: 12, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 2, uuid: 'claude-def456', platform: 'Claude',
    title: 'Rust ownership 机制详解',
    snippet: 'Can you explain Rust ownership, borrowing, and lifetimes with practical examples?',
    url: 'https://claude.ai/chat/def456',
    created_at: Date.now() - 3_600_000, updated_at: Date.now() - 1_800_000,
    message_count: 8, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 3, uuid: 'gemini-ghi789', platform: 'Gemini',
    title: '2024 年最值得关注的 AI 论文',
    snippet: '请帮我梳理 2024 年下半年最有影响力的 AI/ML 论文，按领域分类...',
    url: 'https://gemini.google.com/app/ghi789',
    created_at: Date.now() - 7_200_000, updated_at: Date.now() - 5_400_000,
    message_count: 6, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 4, uuid: 'deepseek-jkl012', platform: 'DeepSeek',
    title: 'PostgreSQL 查询性能优化指南',
    snippet: '我的 SQL 查询在百万级数据表上非常慢，explain analyze 显示全表扫描...',
    url: 'https://chat.deepseek.com/jkl012',
    created_at: Date.now() - 86_400_000, updated_at: Date.now() - 80_000_000,
    message_count: 15, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 5, uuid: 'chatgpt-mno345', platform: 'ChatGPT',
    title: 'Building a Chrome Extension with Plasmo',
    snippet: 'I want to build a browser extension that captures web page content. What framework should I use?',
    url: 'https://chatgpt.com/c/mno345',
    created_at: Date.now() - 172_800_000, updated_at: Date.now() - 170_000_000,
    message_count: 20, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 6, uuid: 'claude-pqr678', platform: 'Claude',
    title: '用 TypeScript 重构遗留代码的最佳实践',
    snippet: '我们团队有一个 5 年历史的 JavaScript 项目，想逐步迁移到 TypeScript，应该怎么规划...',
    url: 'https://claude.ai/chat/pqr678',
    created_at: Date.now() - 259_200_000, updated_at: Date.now() - 250_000_000,
    message_count: 10, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 7, uuid: 'deepseek-stu901', platform: 'DeepSeek',
    title: 'Docker Compose 多服务编排实战',
    snippet: '帮我设计一个 docker-compose.yml，包含 Nginx 反向代理、Node.js 后端、PostgreSQL 和 Redis...',
    url: 'https://chat.deepseek.com/stu901',
    created_at: Date.now() - 345_600_000, updated_at: Date.now() - 340_000_000,
    message_count: 7, is_archived: false, is_trash: false, tags: [],
  },
  {
    id: 8, uuid: 'gemini-vwx234', platform: 'Gemini',
    title: 'SwiftUI vs Flutter 跨平台方案对比',
    snippet: '我想开发一个同时支持 iOS 和 Android 的应用，预算有限，应该选择哪个框架...',
    url: 'https://gemini.google.com/app/vwx234',
    created_at: Date.now() - 432_000_000, updated_at: Date.now() - 430_000_000,
    message_count: 9, is_archived: false, is_trash: false, tags: [],
  },
];

// 为第一条对话提供完整消息流（Reader View 展示用）
export const MOCK_MESSAGES: Message[] = [
  {
    id: 1, conversation_id: 1, role: 'user',
    content_text: '我正在开发一个需要渲染大量列表项的应用，列表可能有上万条数据。直接渲染 DOM 节点会导致严重的性能问题和内存占用。请问用 React 实现虚拟列表（Virtual List）有哪些主流方案？各自的优缺点是什么？',
    created_at: Date.now() - 65_000,
  },
  {
    id: 2, conversation_id: 1, role: 'ai',
    content_text: '在 React 中实现虚拟列表有几种主流方案：\n\n1. **react-window** — Brian Vaughn 开发的轻量库，是 react-virtualized 的精简版。包体积小（约 6KB gzip），API 简洁，支持固定高度和可变高度列表。适合大多数场景。\n\n2. **react-virtualized** — 功能最全的方案，支持表格、网格、瀑布流等多种布局。但包体积较大（约 28KB gzip），API 复杂度高。除非你需要高级功能，否则推荐 react-window。\n\n3. **@tanstack/react-virtual** — TanStack 生态的虚拟化方案，headless 设计，不绑定任何 UI 库。可变高度支持优秀，与 TanStack Table 配合很好。\n\n4. **自己实现** — 核心原理是只渲染可视区域 ± buffer 的 DOM 节点，通过 Intersection Observer 或 scroll 事件计算可见范围。适合学习，但生产环境不建议造轮子。\n\n对于你的万级数据场景，我推荐 react-window + 动态高度测量的组合。需要我写一个具体的实现示例吗？',
    created_at: Date.now() - 62_000,
  },
  {
    id: 3, conversation_id: 1, role: 'user',
    content_text: '请用 react-window 写一个支持动态高度的虚拟列表示例，要求：1. 列表项高度不固定（每项内容长度不同）2. 支持滚动到指定位置 3. 加载更多（infinite scroll）',
    created_at: Date.now() - 60_500,
  },
  {
    id: 4, conversation_id: 1, role: 'ai',
    content_text: '好的，这里是一个完整的实现示例。核心思路是使用 `VariableSizeList` 配合 `react-window` 的 `resetAfterIndex` 方法来处理动态高度：\n\n```tsx\nimport { VariableSizeList as List } from "react-window";\nimport { useRef, useCallback, useEffect } from "react";\nimport InfiniteLoader from "react-window-infinite-loader";\n\ninterface VirtualListProps {\n  items: string[];\n  hasMore: boolean;\n  loadMore: () => Promise<void>;\n}\n\nexport function VirtualList({ items, hasMore, loadMore }: VirtualListProps) {\n  const listRef = useRef<List>(null);\n  const sizeMap = useRef<Record<number, number>>({});\n\n  const getSize = (index: number) => sizeMap.current[index] || 60;\n\n  const setSize = useCallback((index: number, size: number) => {\n    sizeMap.current[index] = size;\n    listRef.current?.resetAfterIndex(index);\n  }, []);\n\n  return (\n    <InfiniteLoader\n      isItemLoaded={(index) => index < items.length}\n      itemCount={hasMore ? items.length + 1 : items.length}\n      loadMoreItems={loadMore}\n    >\n      {({ onItemsRendered, ref }) => (\n        <List\n          ref={(el) => { listRef.current = el; ref(el); }}\n          height={600}\n          itemCount={items.length}\n          itemSize={getSize}\n          onItemsRendered={onItemsRendered}\n          width="100%"\n        >\n          {({ index, style }) => (\n            <ListItem\n              style={style}\n              content={items[index]}\n              index={index}\n              setSize={setSize}\n            />\n          )}\n        </List>\n      )}\n    </InfiniteLoader>\n  );\n}\n```\n\n这个实现有几个关键点：使用 `sizeMap` 缓存每个元素的实际高度，通过 `resetAfterIndex` 在高度变化时触发重新计算，以及用 `InfiniteLoader` 实现无限滚动加载。',
    created_at: Date.now() - 60_000,
  },
  // 为第二条对话也提供消息
  {
    id: 5, conversation_id: 2, role: 'user',
    content_text: 'Can you explain Rust ownership with practical examples? I keep getting borrow checker errors.',
    created_at: Date.now() - 3_600_000,
  },
  {
    id: 6, conversation_id: 2, role: 'ai',
    content_text: 'Rust\'s ownership system has three core rules:\n\n1. Each value has exactly one owner\n2. When the owner goes out of scope, the value is dropped\n3. You can have either one mutable reference OR any number of immutable references\n\nHere\'s a practical example that demonstrates common pitfalls:\n\n```rust\nfn main() {\n    let s1 = String::from("hello");\n    let s2 = s1; // s1 is MOVED, not copied\n    // println!("{}", s1); // ❌ Error: value borrowed after move\n    println!("{}", s2); // ✅ Works\n\n    // To keep both, clone explicitly:\n    let s3 = s2.clone();\n    println!("{} {}", s2, s3); // ✅ Both work\n}\n```\n\nThe most common borrow checker error comes from trying to mutate while borrowing:\n\n```rust\nlet mut v = vec![1, 2, 3];\nlet first = &v[0]; // immutable borrow\nv.push(4);         // ❌ mutable borrow while immutable exists\nprintln!("{}", first);\n```\n\nThe fix is to limit borrow lifetimes — ensure the immutable reference is no longer used before mutating.',
    created_at: Date.now() - 3_500_000,
  },
];
```

---

## Part 3 — 设计系统（严格遵循）

### 3.1 设计哲学

视觉风格遵循 Claude MCP Apps 设计体系：**温暖、克制、功能优先**。
界面像一本排版精良的笔记本——安静、有序、让内容成为主角。

核心原则：
- **渐进式披露：** 默认极简，Hover 时展开细节
- **去边框化：** 用留白和微妙背景色差异区分层级，避免粗重边框
- **平台感知色彩：** 每个 AI 平台有专属标签色，其余保持中性暖色调
- **内容至上：** 排版服务于阅读，行高宽松，代码块清晰

### 3.2 色彩 Token（必须通过 CSS 变量或 Tailwind 类名引用，禁止硬编码 hex）

#### 平台标签配色规范 (Platform Color Palette)

| Platform | Background Token | Hex Value | HSL Value | Text Color | Notes |
|:---|:---|:---|:---|:---|:---|
| **ChatGPT** | `--chatgpt-bg` | `#F3F4F6` | `210 20% 96%` | `#1A1A1A` | Cool Gray / Neutral |
| **Claude** | `--claude-bg` | `#F7D6B8` | `29 80% 85%` | `#1A1A1A` | Warm Flesh / Soft Orange |
| **Gemini** | `--gemini-bg` | `#3B63D9` | `225 68% 54%` | `#FFFFFF` | Google Blue |
| **DeepSeek** | `--deepseek-bg` | `#172554` | `220 90% 20%` | `#FFFFFF` | Deep Indigo / Dark Navy |

**Design Rule:**
- Text colors must be strictly restricted to `#1A1A1A` (Dark) or `#FFFFFF` (Light).
- No colored text allowed on tags.
- Borders are transparent (solid color blocks only).

#### 基础色彩系统

```
背景层级:
  bg-primary:       #FFFFFF     — 主画布
  bg-secondary:     #F7F6F2     — 侧边栏、Dock
  bg-tertiary:      #FAF9F5     — 最外层底色 (RGB 250,249,245)

卡片表面:
  surface-card:       #F0EEE6   — 对话卡片背景（暖米白）
  surface-card-hover: #EAE8DF   — 卡片 Hover
  surface-card-active:#E4E1D7   — 卡片选中
  surface-ai-message: #F5F4F0   — AI 消息气泡（Reader View）

文字:
  text-primary:   #1A1A1A       — 标题、正文（禁止用纯黑 #000000）
  text-secondary: #6B6B6B       — 摘要、辅助
  text-tertiary:  #9B9B9B       — 时间戳、占位符
  text-inverse:   #FFFFFF       — 深色背景上

主交互色（品牌蓝）:
  accent-primary:        #3266AD  — 所有按钮、链接、选中态
  accent-primary-hover:  #2A579A
  accent-primary-active: #234A87
  accent-primary-light:  rgba(50,102,173, 0.08)  — Ghost 按钮 Hover 背景
  accent-primary-muted:  rgba(50,102,173, 0.15)

边框:
  border-default: #E5E3DB
  border-subtle:  #EEECE5
  border-focus:   #3266AD

语义色:
  success: #2D8C4E    warning: #D4860A    danger: #C93A3A

平台标签色（参考 Part 3.2 详细规范）:
  ChatGPT:  bg #F3F4F6 (Cool Gray), text #1A1A1A
  Claude:   bg #F7D6B8 (Warm Flesh), text #1A1A1A
  Gemini:   bg #3B63D9 (Google Blue), text #FFFFFF
  DeepSeek: bg #172554 (Deep Indigo), text #FFFFFF
```

**⚠️ 绝对禁止的颜色：**
- `#C6613F`（Claude 橙）→ 所有交互色用 `#3266AD` 品牌蓝
- 高饱和紫色渐变（AI slop 审美）
- `#000000` 纯黑文字 → 用 `#1A1A1A`
- 任何 `opacity < 0.6` 的重要文字

### 3.3 排版

```
字体族:
  serif: Georgia, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Times New Roman", serif
         — 主字体，衬线体，中英文混排优化，全系统兼容
  ui:    -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif
         — UI 辅助字体，用于极小号文字（标签、角标、按钮）可读性更好
  mono:  "Cascadia Mono", "Consolas", "SF Mono", "Menlo", "Liberation Mono", monospace
         — 代码字体，Reader View 中的代码块

字号（基于 4px 网格）:
  xs: 11px    — 时间戳、角标
  sm: 12px    — 平台标签、计数器
  base: 13px  — 卡片标题、设置项（SidePanel 基准）
  md: 14px    — 搜索框、摘要预览
  lg: 16px    — Reader View 正文
  xl: 18px    — 页面标题
  2xl: 22px   — Dashboard 大标题

字重: 400(normal) / 500(medium, 卡片标题) / 600(semibold, 页面标题) / 700(bold, 仅 KPI 大数字)
行高: 1.3(标题) / 1.5(列表) / 1.7(Reader View 长文) / 1.85(代码块)
```

### 3.4 间距 / 圆角 / 阴影

```
间距（4px 网格）:
  1:4px  2:8px  3:12px  4:16px  5:20px  6:24px  8:32px  10:40px  12:48px

  卡片内 padding: 12px    卡片间 gap: 8px    页面侧边 padding: 16px

圆角:
  xs:4px(标签)  sm:6px(输入框/按钮)  md:8px(卡片)  lg:12px(大容器)  full:9999px(胶囊)

阴影（极度克制）:
  card-hover: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
  popover:    0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)
  capsule:    0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)

过渡:
  fast: 0.12s ease (按钮 Hover)
  normal: 0.2s ease (面板展开)
  slow: 0.3s ease (长文折叠)
禁止: bounce, spring, 超过 0.5s 的非循环动画
```

### 3.5 Logo 规范

项目 Logo 是一个**猫头鹰图标**（象征智慧与记忆），纯黑色线条，透明背景。

**在 v0 原型中的使用方式：**  
直接使用以下 base64 内联 PNG（32×32），无需上传额外文件：

```typescript
// --- constants/logo.ts ---
export const LOGO_BASE64 = "data:image/png;base64,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";

// Usage in components:
// <img src={LOGO_BASE64} alt="心迹 Vesti" width={24} height={24} />
```

**Logo 使用场景：**

| 场景 | 尺寸 | 说明 |
|:---|:---|:---|
| Dock 栏顶部 | 24×24 px | 应用标识 |
| Status Bar 左侧 | 20×20 px | 紧凑模式 |
| Capsule Widget 左侧 | 20×20 px | 深色背景上使用，需 `filter: invert(1)` 反色为白色 |
| Settings 关于页 | 48×48 px | 居中展示 |

**注意：** Logo 不应添加任何额外的阴影、描边或背景装饰。保持原始简洁性。

---

## Part 4 — 页面与组件规格

**整体布局：** 模拟一个宽 380px、高 100vh 的 Chrome SidePanel。外层容器用固定宽度居中展示。

### 4.1 全局 Shell

```
┌──────────────────────────────────────────────┐
│  [主内容区 flex-1]              [Dock 48px]  │
│  ┌────────────────────────┐    ┌──────────┐  │
│  │ Status Bar (32px)      │    │ 🏠 Home  │  │
│  │ 857 conversations · +3 │    │ 📊 Stats │  │
│  ├────────────────────────┤    │ 💡 Ideas │  │
│  │ Search Input           │    │          │  │
│  ├────────────────────────┤    │  (flex)  │  │
│  │                        │    │          │  │
│  │ Conversation Card List │    │ ⚙️ Set  │  │
│  │ (scrollable)           │    │ 💾 Store │  │
│  │                        │    └──────────┘  │
│  └────────────────────────┘                  │
└──────────────────────────────────────────────┘
```

- Dock 栏固定右侧，宽 48px，背景 `bg-secondary`
- Dock 图标 20px，默认 `text-secondary`，选中 `accent-primary` + `accent-primary-light` 背景
- 主内容区占满剩余宽度
- 页面间导航用简单的条件渲染（`currentPage` state），不引入路由库

### 4.2 Page: Timeline Feed（首页）🔴

**Status Bar（顶部 32px）：**
- 左侧：Logo（24px）+ 应用名「心迹」(`text-base`, `font-semibold`)
- 右侧：统计数字（如 `857 conversations · +3 today`），`text-xs`, `text-tertiary`

**Search Input：**
- 背景白色，边框 `border-default`，圆角 `sm`(6px)
- 左侧 Lucide `Search` 图标 16px
- placeholder: "搜索对话标题或内容..."
- Focus: border 变 `accent-primary`，加 `0 0 0 2px accent-primary-light` 外发光
- 右侧可选：Filter 漏斗图标（点击展开筛选面板 — Should-have，原型中预留图标即可）

**Conversation Card（核心原子组件）：**
```
┌────────────────────────────────────────┐  bg: surface-card, radius: md(8px)
│  [ChatGPT]              1 分钟前       │  顶行: 平台标签(左) + 相对时间(右)
│                                        │
│  如何用 React 实现虚拟列表优化          │  标题: text-base, font-medium
│                                        │
│  ──── Hover 后展开 ────                │  
│                                        │
│  我正在开发一个需要渲染大量列表...       │  摘要: text-sm, text-secondary, line-clamp-2
│                                        │
│  💬 12 轮           [✏️] [↗️] [🗑️]   │  底行: 轮数(左) + 操作栏(右, Hover出现)
└────────────────────────────────────────┘
```

- 默认静态：标题 + 平台标签 + 时间戳
- Hover：背景渐变到 `surface-card-hover`，出现 `shadow-card-hover`，展开摘要行和操作栏
- 操作按钮用 Ghost Button 样式（透明底，Hover 时 `accent-primary-light` 底 + `accent-primary` 色图标）
- 点击卡片 → 导航到 Reader View
- 过渡：`transition: all 0.15s ease`

**Platform Tag（胶囊标签）：**
- **Shape:** Rounded Rectangle / Soft Box
- **Border Radius:** `8px` (matches Tailwind `rounded-md`)
- **Padding:** `2px 8px` (Compact but legible)
- **Font:** `text-xs`(11px), `font-medium`
- **Border:** None / Transparent (Solid color blocks only)
- **Shadow:** None (Flat design)
- 各平台使用专属 bg/text Token（见 3.2 平台标签配色规范）
- **Behavior:** Tags function as static indicators; hover states (if actionable) should darken background brightness by 10%

### 4.3 Page: Reader View（对话详情）🔴

**触发：** 点击 Timeline 中的卡片

**Sticky Header (44px)：**
- 左：`ArrowLeft` 返回按钮 (20px) + 标题 (`text-base`, 单行截断 ellipsis)
- 右：平台标签 + 💬 轮数

**消息流：**
- 垂直流式，按时间正序排列
- 用户消息：背景 `transparent`，角色标签 "You" (`text-xs`, `text-tertiary`)
- AI 消息：背景 `surface-ai-message` (#F5F4F0)，圆角 `md`(8px)，padding 12px
  角色标签显示平台名
- 消息间距 16px
- 正文 `text-lg`(16px)，行高 1.7
- 代码块用 `font-mono`，背景 `#F5F4F0`，圆角 `sm`(6px)，padding 12px
- Hover 单条消息 → 右上角出现 Copy 按钮 (Ghost Button)

**智能长文折叠：**
- 阈值：500 字符
- 折叠时底部渐变遮罩（`linear-gradient(transparent, bg-tertiary)`，高 60px）
- 展开按钮："展开全文 ↓"，`text-sm`, `accent-primary`
- 动画：`max-height` transition 0.3s ease

### 4.4 Page: Dashboard（量化面板）🟢

**如果时间允许，实现以下：**

- **KPI 卡片行** (3-4 个，grid auto-fit)：
  - Knowledge Base: 总对话数（大数字 `text-2xl` `font-bold`）
  - Tokens: 估算总字符数
  - Active Streak: 连续天数 + 🔥 emoji
  - 每张 KPI 卡片：`surface-card` 背景，`radius-md`，padding 16px
- **Contribution Heatmap**（仿 GitHub）：52×7 CSS Grid，色块 10px，4 级绿色
- **Platform Distribution**：Recharts 饼图或 horizontal bar chart

**降级：** 如果太复杂，只输出 KPI 卡片，跳过 Heatmap 和 Chart。

### 4.5 Page: Settings（设置面板）🔴(基础) / 🟡(高级)

- **捕获模式：** Radio Group — 全量镜像(默认) / 智能降噪 / 手动归档
  - MVP 只展示"全量镜像"选中态，其他两项 disabled + "Coming Soon" 标记
- **存储用量：** 进度条 + 文字 (如 `312 KB / 5 GB`)
- **导出数据：** 按钮"导出为 JSON"
- **清空数据：** 红色 Danger Button，点击弹出二次确认 Dialog
- **关于：** 版本号 v0.1.0 · 作者 · 项目链接

### 4.6 Component: Capsule Widget（胶囊悬浮条预览）🟡

在原型中作为**独立的展示组件**放在页面底部或单独 section，模拟注入宿主页面的效果：

```
  ┌──────────────────────────────────────┐  深色胶囊
  │  [Logo] 🟢  自动保存中        [💾]  │  bg: rgba(26,26,26,0.88)
  └──────────────────────────────────────┘  backdrop-blur: 12px
```

- `border-radius: 9999px`, `z-index: 2147483646`
- 文字 `text-inverse`, `text-xs`
- 呼吸灯：8px 圆点，绿色，`animation: breathing 2.5s ease-in-out infinite`
- 展示多种状态的 Variant（RECORDING / STANDBY / PAUSED / SAVED）

---

## Part 5 — 代码质量与交付要求

### 5.1 编码规范

- 所有组件用 **TypeScript**，props 必须有明确类型定义
- **禁止 `any` 类型**
- 使用 **函数组件 + Hooks**，禁止 class components
- shadcn/ui 的 `--primary` 色必须覆盖为 `#3266AD`
- 所有可交互元素必须有 `focus-visible` 样式
- 图标按钮必须有 `aria-label`
- 禁止使用 `localStorage` / `sessionStorage`

### 5.2 文件结构标注

即使 v0 输出为单文件，也必须用注释标注清晰的文件边界，按此结构组织：

```
types/index.ts           — 所有接口定义
data/mockData.ts         — 模拟数据
services/mockService.ts  — 服务层（唯一数据出口）
components/
  ConversationCard.tsx   — 对话卡片（展示组件）
  PlatformTag.tsx        — 平台标签（展示组件）
  SearchInput.tsx        — 搜索框
  MessageBubble.tsx      — 消息气泡（Reader View）
  KpiCard.tsx            — KPI 卡片（Dashboard）
  CapsuleWidget.tsx      — 胶囊悬浮条预览
  Dock.tsx               — 右侧导航栏
containers/
  ConversationList.tsx   — 获取数据 + 渲染卡片列表
  ReaderView.tsx         — 获取消息 + 渲染对话流
pages/
  TimelinePage.tsx       — 首页：Status Bar + Search + List
  DashboardPage.tsx      — 量化面板
  SettingsPage.tsx       — 设置
App.tsx                  — Shell + Dock + 页面路由
```

### 5.3 交付物

生成完整的、可运行的原型，包含：

1. ✅ Timeline Feed 完整页面（搜索 + 卡片列表 + Hover 交互）
2. ✅ Reader View 完整页面（Sticky Header + 消息流 + 长文折叠）
3. ✅ Settings 基础页面（存储 + 清空 + 关于）
4. ✅ Dock 导航栏（页面切换）
5. ✅ Mock 数据（至少 8 条对话、覆盖 4 个平台）
6. ✅ Service Layer 完整定义（含注释标注生产环境替换方式）
7. 🟡 Dashboard 页面（如果空间允许）
8. 🟡 Capsule Widget 展示组件

---

## 附录 — 迁移到 Plasmo 的路径（仅供参考，不影响原型生成）

原型完成后，迁移到真实 Chrome 插件的步骤：

1. `pnpm create plasmo` 初始化项目
2. 将 `types/`、`data/`、`components/`、`containers/`、`pages/` 整体复制
3. 将 `services/mockService.ts` 替换为 `services/storageService.ts`（内部调用 Dexie.js）
4. 在 `contents/` 目录添加 Content Script（MutationObserver + Parser）
5. 在 `background.ts` 添加 Service Worker 桥接
6. 注册 SidePanel：`plasmo.json` 配置 `side_panel`
7. 胶囊组件迁移到 Plasmo 的 `csui` Content Script UI

**原型中的每一个 `mockService` 调用都会映射到一个真实的 Dexie 操作。** 这就是服务层隔离的价值。


---

## Frontend UI Guardrails (v1.2.x Short)

### 1) Token and Theme Contract

- Warm Paper palette is mandatory; do not introduce ad-hoc cold-gray overrides.
- All surface, text, border, and shadow values must come from semantic tokens.
- Tag and card shadows must stay in warm tone family.

### 2) Typography Role Separation

- `vesti-page-title`: page-level H1 only.
- `vesti-brand-wordmark`: Timeline brand wordmark only.
- `app_shell` content uses sans; `artifact_content` uses reading serif.
- Do not bind `font-family` inside generic size utilities.

### 3) Toggle Geometry Contract (No Jitter)

- Track: `44x24`; Thumb: `20x20`; X travel: `20px`.
- Vertical alignment must be center-locked: `top: 50% + translateY(-50%)`.
- Checked/unchecked transitions may change X only; Y must remain fixed.

### 4) Progressive Disclosure IA

- Data governance must live in dedicated Dock tab: `Data`.
- Settings keeps concise entry guidance, not duplicated full data operation blocks.

### 5) Action Safety and Interaction Rhythm

- Conversation card actions order: `Copy -> Open Source -> Delete`.
- Tooltip delay: `200ms`; copy feedback reset: `1500ms`.
- Destructive actions stay right-most and visually de-emphasized.

### 6) Font Asset Contract

- Ship WOFF2 assets in repo and preload at sidepanel bootstrap.
- On missing assets, warn once and degrade gracefully to fallback serif stack.

### 7) UI Release Gate (Fast Checklist)

- Verify serif/sans role mapping on Timeline, Insights, Data, and Settings.
- Verify toggle pixel centering in both states and under rapid switching.
- Verify Data tab path works from both Dock and Settings entry card.
- Verify dangerous operations keep explicit confirmation and preserve LLM config.
- Verify packaged behavior equals dev behavior (`pnpm -C frontend build`, `pnpm -C frontend package`).
