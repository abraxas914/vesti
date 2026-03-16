# LLM 智能压缩引入与合并指南

> 说明：本系统引入 Kimi LLM 实现对话导出的 Compact/Summary 智能压缩，替代原有简单截断方案。（后续可以更换使用其他llm）

---

## 一、设计概述

### 引入原因
原系统导出功能使用简单字符截断，长对话信息丢失严重。引入 LLM 智能压缩，在保留关键信息的同时大幅减少输出长度。

### 三种导出模式

| 模式 | 实现方式 | 输出特点 |
|------|---------|---------|
| **Full** | 本地处理 | 完整对话，无压缩 |
| **Compact** | Kimi API | 紧凑格式，适合粘贴给其他 AI |
| **Summary** | Kimi API | 结构化笔记，适合保存到 Notion/Obsidian |

### 架构

```
用户选择导出模式
    │
    ├──→ Full ──────────────→ 本地拼接完整对话
    │
    └──→ Compact/Summary ───→ 检查 Kimi API Key
                                  │
                    有 Key ───────┴─────── 无 Key
                      │                      │
                      ▼                      ▼
                调用 Kimi API           本地简单截断
                      │                      │
                      ▼                      ▼
                专用 Prompt 压缩        硬截断处理
                      │                      │
                      └──────────┬───────────┘
                                 ▼
                            格式化输出
```

---

## 二、新增文件

### 1. API Key 管理
**文件**: `frontend/src/lib/config/apiKeys.ts` (88 行)

```typescript
// 核心接口
export async function getKimiApiKey(): Promise<string>
export async function setKimiApiKey(apiKey: string): Promise<boolean>
export async function hasKimiApiKey(): Promise<boolean>
```

**特点**:
- 优先级: Chrome Storage > 环境变量 `.env`
- `.env` 已加入 `.gitignore`，不会提交到 Git

### 2. Kimi 服务
**文件**: `frontend/src/lib/services/kimiService.ts` (299 行)

```typescript
// 核心接口
export async function compressCompact(messages, title): Promise<KimiCallResult>
export async function compressSummary(messages, metadata): Promise<KimiCallResult>
```

**特点**:
- 200K 长上下文，一次性处理完整对话
- 专用 Prompt 生成结构化输出
- 失败时返回错误，由调用方降级处理

### 3. 导出 V2 实现
**文件**: `frontend/src/sidepanel/utils/exportConversationsV2.ts` (272 行)

**特点**:
- 检测是否有 Kimi API Key，有则使用 AI 压缩
- 无 Key 或失败时降级到本地简单压缩
- 支持 Markdown/TXT/JSON 三种格式

### 4. 环境变量示例
**文件**: `frontend/.env.example`

```bash
PLASMO_PUBLIC_KIMI_API_KEY=your-kimi-api-key-here
```

---

## 三、修改文件

### 1. 导出入口
**文件**: `frontend/src/sidepanel/pages/TimelinePage.tsx`

**修改**:
```typescript
// 第 16 行：添加导入
import { exportConversationsV2 } from "../utils/exportConversationsV2";

// 第 77 行：修改导出调用
const handleExport = async (config: ExportConfig): Promise<ExportResult> => {
  const selectedConversations = conversations.filter((c) => selectedIds.has(c.id));
  return exportConversationsV2(selectedConversations, config);  // 改为 V2
};
```

### 2. Git 忽略
**文件**: `frontend/.gitignore`

**修改**:
```gitignore
# 添加 .env 保护 API Key
.env
```

---

## 四、与原系统的关系

| 模块 | 关系 | 说明 |
|------|------|------|
| 原导出功能 | 并存 | `exportConversations.ts` 保留，但 TimelinePage 改用 V2 |
| Insight 生成 | 无关联 | 使用原有 compaction prompt，未改动 |
| 原 LLM 体系 | 无关联 | Kimi 独立配置，不依赖 SettingsPage 的 LLM 配置 |
| 数据库 | 无关联 | 不修改对话存储，仅在导出时处理 |

---

## 五、配置使用

### 1. 开发环境配置

```bash
# 1. 复制环境变量文件
cp frontend/.env.example frontend/.env

# 2. 编辑 .env 填入你的 Kimi API Key
PLASMO_PUBLIC_KIMI_API_KEY=sk-xxxxxxxxxxxxxxxx

# 3. 获取 API Key: https://platform.moonshot.cn/
```

### 2. 使用方式

1. 选择对话 → 点击导出
2. 选择模式:
   - **Full**: 完整内容（无 AI 调用，免费）
   - **Compact**: AI 压缩（需要 API Key，适合发给其他 AI）
   - **Summary**: AI 压缩（需要 API Key，适合保存到笔记）
3. 无 API Key 时自动降级到本地简单压缩

---

## 六、合并指南

### 合并前检查

```bash
# 确认新增文件存在
ls frontend/src/lib/config/apiKeys.ts
ls frontend/src/lib/services/kimiService.ts
ls frontend/src/sidepanel/utils/exportConversationsV2.ts
ls frontend/.env.example

# 确认修改文件
# - TimelinePage.tsx 第 77 行改为调用 exportConversationsV2
# - .gitignore 包含 .env
```

### 合并步骤

```bash
# Step 1: 添加新增文件
git add frontend/src/lib/config/
git add frontend/src/lib/services/kimiService.ts
git add frontend/src/sidepanel/utils/exportConversationsV2.ts
git add frontend/.env.example
git add frontend/.env.security.md  # 如果存在

# Step 2: 确认修改文件
git add frontend/src/sidepanel/pages/TimelinePage.tsx
git add frontend/.gitignore

# Step 3: 提交
git commit -m "feat: 引入 Kimi LLM 智能压缩，支持 Compact/Summary 导出模式"

# Step 4: 测试构建
cd frontend && pnpm build
```

### 合并后验证

1. **Full 模式**: 导出完整对话，无 API 调用
2. **Compact/Summary 无 Key**: 降级到本地压缩
3. **Compact/Summary 有 Key**: 调用 Kimi API，输出结构化内容

---

## 七、常见问题

**Q: 不配置 Kimi API Key 能用吗？**
A: 可以。Full 模式不受影响，Compact/Summary 会降级到本地简单压缩。

**Q: 费用高吗？**
A: 一般。导出 3 个普通对话约 ¥0.15-0.30。

**Q: 如何完全禁用 Kimi？**
A: 不配置 API Key 即可。如需彻底移除，删除 3 个新增文件，恢复 TimelinePage 第 77 行为原导出函数。

**Q: 可以换成其他 LLM 吗？**
A: 可以。修改 `kimiService.ts` 中的 API 调用部分，Prompt 设计是通用的。

---

## 八、文件清单汇总

### 新增（4 个）
- `src/lib/config/apiKeys.ts`
- `src/lib/services/kimiService.ts`
- `src/sidepanel/utils/exportConversationsV2.ts`
- `.env.example`

### 修改（2 个）
- `src/sidepanel/pages/TimelinePage.tsx` (2 处)
- `.gitignore` (1 处)

### 代码总行数
- 新增: ~660 行
- 修改: ~5 行
- **侵入性: 低**

---

*文档版本: 1.0*  
*更新日期: 2026-03-16*
