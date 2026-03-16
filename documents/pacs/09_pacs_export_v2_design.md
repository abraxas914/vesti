# PACS Export V2 设计方案

> **版本**: v2.0  
> **状态**: 已确认，实施中  
> **创建日期**: 2026-03-16  
> **关联文档**: PACS 系统优化

---

## 设计背景

基于用户研究和痛点分析，重新设计 Compact 和 Summary 导出模式。

---

## Compact 模式设计

### 目标场景
将对话导出后粘贴到其他 AI 工具（如从 Kimi 导出给 Claude）继续对话。

### 核心原则
1. **完整压缩**：保证合理内容都被压缩，**禁止截断**
2. **上下文完整**：保留足够背景让 AI 理解
3. **去除噪音**：去除寒暄、重复、确认等低信息内容
4. **长度控制**：通过压缩而非截断控制长度（目标 2K-4K tokens）

### 输出格式

```markdown
[主题] React 性能优化讨论

[背景]
项目使用 React 18，遇到大型列表渲染卡顿问题。已尝试 memo 但效果不佳。

[关键决策]
1. 采用 react-window 实现虚拟滚动（替代原生渲染）
2. 使用 useMemo 缓存计算结果（已验证有效）
3. 暂缓使用 Web Workers（复杂度太高）

[核心代码]
```jsx
// 虚拟滚动实现
import { FixedSizeList } from 'react-window';
// ... 完整可运行代码
```

[待解决问题]
- 移动端兼容性待测试
- 需要补充单元测试

[来源] 5 轮对话整理
```

### 技术实现

```typescript
// 使用 Kimi AI 进行智能压缩
const COMPACT_SYSTEM_PROMPT = `你是一个专业的对话压缩助手。
任务：将对话压缩为简洁但信息完整的内容。

要求：
1. 保留所有关键信息、决策和结论
2. 去除寒暄、重复、确认等低信息内容
3. 保留完整代码块（不要截断）
4. 按 [主题] [背景] [关键决策] [核心代码] [待解决问题] 格式输出
5. 不要输出其他内容`;
```

---

## Summary 模式设计

### 目标场景
导出后作为笔记保存到 Notion/Obsidian，建立知识库。

### 核心原则
1. **结构化但扁平**：最多 2 级标题
2. **可复用**：保留代码、决策、依据
3. **可搜索**：包含标签、关键词
4. **行动导向**：包含待办/后续行动

### 输出格式

```markdown
# React 性能优化方案

> 日期：2024-03-16 | 平台：Kimi | 对话数：5 轮

## TL;DR
通过虚拟滚动 + useMemo 优化，将列表渲染时间从 200ms 降至 80ms。

## 问题定义
大型列表组件（1000+ 项）渲染卡顿，影响用户体验。

## 解决方案对比

| 方案 | 效果 | 复杂度 | 决策 |
|------|------|--------|------|
| useMemo | 中等 | 低 | ✅ 采用 |
| 虚拟滚动 | 高 | 中 | ✅ 采用 |
| Web Workers | 高 | 高 | ❌ 暂缓 |

## 可复用代码

### 虚拟滚动组件
```jsx
// 完整代码，可直接使用
import { FixedSizeList } from 'react-window';
// ...
```

## 关键决策依据
- 虚拟滚动减少 DOM 节点数量（从 1000 降至 10）
- useMemo 避免不必要计算（缓存 expensive 操作）

## 后续行动
- [ ] 移动端兼容性测试
- [ ] 补充性能监控
- [ ] 文档化最佳实践

## 相关标签
#React #Performance #虚拟滚动 #前端优化
```

### 技术实现

```typescript
const SUMMARY_SYSTEM_PROMPT = `你是一个专业的知识整理助手。
任务：将对话整理为结构化的知识笔记。

要求：
1. 按格式输出：标题 → TL;DR → 问题定义 → 解决方案 → 代码 → 决策依据 → 后续行动 → 标签
2. 保留完整代码块
3. 使用表格对比不同方案
4. 提取待办事项（checkbox 格式）
5. 添加相关标签（#标签 格式）
6. 最多使用 2 级标题`;
```

---

## API Key 安全方案

### 问题
API Key 不应硬编码在代码中，存在泄露风险。

### 解决方案

#### 方案 1：配置文件（推荐用于开发）

```
项目结构：
frontend/
├── .env                      # 环境变量（不提交 Git）
├── .env.example              # 示例文件（提交 Git）
├── .gitignore                # 忽略 .env
└── src/
    └── lib/
        └── config/
            └── apiKeys.ts    # 读取环境变量
```

**文件内容**：

```bash
# .env
# Kimi API Key（不要提交到 Git）
PLASMO_PUBLIC_KIMI_API_KEY=sk-your-api-key-here
```

```typescript
// src/lib/config/apiKeys.ts
export const KIMI_API_KEY = process.env.PLASMO_PUBLIC_KIMI_API_KEY || "";
```

```gitignore
# .gitignore
.env
*.local
```

#### 方案 2：Chrome Storage（推荐用于生产）

用户在设置面板输入 API Key，存储在 Chrome Storage 中。

```typescript
// 存储 API Key
await chrome.storage.local.set({ 
  kimiApiKey: "sk-your-api-key" 
});

// 读取 API Key
const { kimiApiKey } = await chrome.storage.local.get("kimiApiKey");
```

**优点**：
- 每个用户独立配置
- 不随代码分发
- 可加密存储

#### 最终方案：混合模式

1. **开发时**：使用 `.env` 文件
2. **生产时**：用户通过设置面板配置，存储在 Chrome Storage
3. **优先级**：Chrome Storage > .env > 空（提示用户配置）

```typescript
// 获取 API Key
async function getKimiApiKey(): Promise<string> {
  // 1. 优先从 Chrome Storage 读取
  const { kimiApiKey } = await chrome.storage.local.get("kimiApiKey");
  if (kimiApiKey) return kimiApiKey;
  
  // 2. 其次从环境变量读取
  if (process.env.PLASMO_PUBLIC_KIMI_API_KEY) {
    return process.env.PLASMO_PUBLIC_KIMI_API_KEY;
  }
  
  // 3. 返回空（提示用户配置）
  return "";
}
```

---

## 实施计划

### Phase 1：API Key 安全方案（1h）
- [ ] 创建 `.env` 文件并添加到 `.gitignore`
- [ ] 创建 `apiKeys.ts` 配置读取模块
- [ ] 更新 Kimi Service 使用新的 API Key 读取方式
- [ ] 清理代码中的硬编码 API Key

### Phase 2：Compact 模式优化（2h）
- [ ] 编写新的 Compact Prompt
- [ ] 实现无截断压缩逻辑
- [ ] 测试长度控制效果

### Phase 3：Summary 模式优化（2h）
- [ ] 编写新的 Summary Prompt
- [ ] 实现结构化输出
- [ ] 测试格式效果

### Phase 4：集成测试（1h）
- [ ] 测试 Compact 导出
- [ ] 测试 Summary 导出
- [ ] 验证 API Key 安全

---

## 文档更新

- 本设计方案已记录
- API Key 安全方案已记录
- 使用说明待补充

---

*设计方案确认于 2026-03-16*
