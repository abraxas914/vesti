# PACS + Kimi 压缩机制 - 代码合并说明

> 本文档说明新增的 PACS 和 Kimi 两套压缩机制与原系统的关系，以及合并工作的注意事项。

---

## 一、系统压缩机制概览

### 三套压缩机制并存

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vesti 压缩机制演进                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  原有机制（原系统）                                      │   │
│  │  ├── Insight 生成: 直接截断 (truncateForContext)        │   │
│  │  └── 导出功能: 简单字符截断                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  新增机制 1: PACS (Production Adaptive Compression)      │   │
│  │  ├── 场景: Insight 生成、周报、存储归档                  │   │
│  │  ├── 驱动: ModelScope API (DeepSeek/Qwen)               │   │
│  │  └── 特点: 语义分块 + 分层摘要 + 质量门禁              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  新增机制 2: Kimi 专用压缩                               │   │
│  │  ├── 场景: 对话导出 (Full/Compact/Summary)              │   │
│  │  ├── 驱动: Kimi API (moonshot-v1-32k)                   │   │
│  │  └── 特点: 长上下文、专用 Prompt、输出格式优化         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、原有机制（基线）

### 原有 Insight 生成
```typescript
// llmService.ts
export function truncateForContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[...truncated...]`;
}
```
**问题**：硬截断，可能切断关键信息

### 原有导出功能
- 简单字符数限制（如每轮对话最多 5000 字符）
- 超出部分直接丢弃

---

## 三、新增机制 1: PACS

### 设计目标
为 Insight 生成、周报等场景提供**智能压缩**，替代简单截断。

### 核心组件

| 组件 | 功能 | 状态 |
|------|------|------|
| `SemanticChunker` | 语义分块 | ✅ 已实现 |
| `HierarchicalSummarizer` | 分层摘要 | ✅ 已实现 |
| `SmartRouter` | 策略选择 | ✅ 已实现 |
| `QualityGate` | 质量门禁 | ✅ 已实现 |
| `CompressionCache` | 三级缓存 | ✅ 已实现 |
| `KnowledgeGraphExtractor` | 知识图谱 | 🔄 部分实现 |

### 应用场景

```typescript
type CompressionScenario =
  | "summary_thread"     // 单对话 Insight 生成 ← 主场景
  | "summary_weekly"     // 周报生成 ← 主场景
  | "storage_archive"    // 存储归档
  | "export_notion"      // 导出（可被 Kimi 替代）
  | "realtime_preview";  // 实时预览
```

### 与原有系统的集成

```typescript
// insightGenerationService.ts
import { runCompactionWithPacs } from "../compression/insightAdapter";

// 生成 Insight 时的调用链
async function generateConversationSummary(...) {
  // 1. 检查是否需要压缩（消息数/字符数阈值）
  if (shouldSkipCompaction(conversation, messages)) {
    // 短对话：直接生成（不走压缩）
    return directGeneration();
  }
  
  // 2. 尝试使用 PACS 压缩
  const compaction = await runCompactionWithPacs({
    conversation,
    messages,
    settings: llmSettings,
  });
  
  if (compaction.used) {
    // PACS 成功：使用压缩后的内容生成 Insight
    return generateWithCompactedContent(compaction.content);
  }
  
  // 3. 降级：原有截断逻辑
  return generateWithTruncatedContent(messages);
}
```

### Feature Flag 控制

```typescript
// 可通过 Settings 完全禁用
interface CompressionFeatureFlags {
  useSmartCompression: boolean;    // 总开关
  enableCompressionCache: boolean; // 缓存开关
  enableQualityGate: boolean;      // 质量门禁
  compressionLevel: "auto" | "semantic" | "hierarchical" | "knowledge";
}
```

---

## 四、新增机制 2: Kimi 专用压缩

### 设计目标
为**对话导出**场景提供优化的压缩和格式化。

### 为什么不用 PACS 做导出？

| 维度 | PACS | Kimi 导出专用 |
|------|------|--------------|
| **上下文长度** | 32K-128K | 200K（可一次性处理长对话） |
| **输出格式** | 通用摘要 | 针对导出场景定制（Compact/Summary） |
| **Prompt 优化** | 通用压缩 | 专用 Prompt（上下文转移/知识库） |
| **成本** | 低（ModelScope） | 中等（但效果更好） |
| **应用场景** | Insight、周报 | 导出功能专用 |

### 三种导出模式

```typescript
// exportConversationsV2.ts
export async function exportConversationsV2(...) {
  switch (contentMode) {
    case "full":
      // 完整导出，不压缩
      return exportFull(conversations, messagesMap, config);
      
    case "compact":
      // Compact 模式：上下文转移优化
      // 使用 Kimi compressCompact
      return exportWithAI(conversations, messagesMap, config);
      
    case "summary":
      // Summary 模式：知识库优化
      // 使用 Kimi compressSummary
      return exportWithAI(conversations, messagesMap, config);
  }
}
```

### 输出格式对比

**Compact 模式**（上下文转移）：
```
[主题] React 性能优化
[背景] 用户遇到大型列表渲染卡顿...
[关键决策] 1. 使用 react-window...
[核心代码] ```jsx ... ```
[待解决问题] 无
[来源] 5 轮对话整理
```

**Summary 模式**（知识库）：
```markdown
# React 性能优化
> 2024-03-16 | ChatGPT | 5 轮

## TL;DR
使用 react-window 实现虚拟滚动...

## 问题定义
...

## 解决方案对比
| 方案 | 效果 | 复杂度 |
|------|------|--------|
...

## 可复用代码
```jsx
...
```

## 后续行动
- [ ] 集成到项目

## 相关标签
#React #性能优化
```

---

## 五、两套新增机制的关系

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      新增压缩体系                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────┐      ┌─────────────────────┐         │
│   │      PACS           │      │   Kimi 压缩         │         │
│   │   (ModelScope)      │      │   (Moonshot)        │         │
│   ├─────────────────────┤      ├─────────────────────┤         │
│   │                     │      │                     │         │
│   │ 应用场景:           │      │ 应用场景:           │         │
│   │ • Insight 生成      │      │ • 对话导出          │         │
│   │ • 周报生成          │      │ • Compact/Summary   │         │
│   │ • 存储归档          │      │                     │         │
│   │                     │      │ 驱动:               │         │
│   │ 驱动:               │      │ Kimi API Key        │         │
│   │ ModelScope/Proxy    │      │                     │         │
│   │                     │      │ 配置:               │         │
│   │ 配置:               │      │ .env / Chrome       │         │
│   │ SettingsPage        │      │ Storage             │         │
│   │                     │      │                     │         │
│   │ 核心:               │      │ 核心:               │         │
│   │ 语义分块 + 分层摘要 │      │ 长上下文 +          │         │
│   │                     │      │ 专用 Prompt         │         │
│   └─────────────────────┘      └─────────────────────┘         │
│                                                                 │
│   共同点:                                                       │
│   • 都不影响原始数据存储                                        │
│   • 都有 Feature Flag 控制                                      │
│   • 失败时都降级到原有机制                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 为什么不合并？

1. **场景差异大**
   - Insight 生成需要提取关键决策 → PACS 分层摘要更合适
   - 导出需要保留完整上下文 → Kimi 长上下文更合适

2. **优化方向不同**
   - PACS 追求压缩比和质量平衡
   - Kimi 追求输出格式和可用性

3. **成本和稳定性考量**
   - PACS 使用 ModelScope（免费/低成本）处理高频场景
   - Kimi 用于导出（低频、对质量要求高）

---

## 六、新增文件清单

### PACS 相关

| 文件路径 | 说明 | 合并优先级 |
|---------|------|-----------|
| `frontend/src/lib/compression/types.ts` | PACS 类型定义 | P1 |
| `frontend/src/lib/compression/semanticChunker.ts` | 语义分块 | P1 |
| `frontend/src/lib/compression/hierarchicalSummarizer.ts` | 分层摘要 | P1 |
| `frontend/src/lib/compression/smartRouter.ts` | 策略路由 | P1 |
| `frontend/src/lib/compression/qualityGate.ts` | 质量门禁 | P1 |
| `frontend/src/lib/compression/compressionCache.ts` | 三级缓存 | P1 |
| `frontend/src/lib/compression/compressionService.ts` | 服务入口 | P1 |
| `frontend/src/lib/compression/insightAdapter.ts` | Insight 集成适配器 | P1 |
| `frontend/src/lib/compression/textCleaner.ts` | 文本清理工具 | P2 |
| `frontend/src/lib/compression/index.ts` | 统一导出 | P1 |
| `frontend/src/lib/services/compressionSettingsService.ts` | 设置管理 | P1 |

### Kimi 相关

| 文件路径 | 说明 | 合并优先级 |
|---------|------|-----------|
| `frontend/src/lib/config/apiKeys.ts` | API Key 管理 | P1 |
| `frontend/src/lib/services/kimiService.ts` | Kimi API 服务 | P1 |
| `frontend/src/sidepanel/utils/exportConversationsV2.ts` | 导出 V2 | P2 |
| `frontend/.env.example` | 环境变量示例 | P2 |
| `frontend/.env.security.md` | 安全指南 | P3 |

### 修改文件

| 文件路径 | 改动内容 | 确认事项 |
|---------|---------|---------|
| `frontend/src/lib/db/schema.ts` | 添加 `compression_cache` 表 | Schema v6 版本 |
| `frontend/src/lib/services/insightGenerationService.ts` | 集成 PACS 适配器 | 确认降级逻辑 |
| `frontend/src/sidepanel/utils/exportConversations.ts` | 可选使用 PACS | 确认导入路径 |

---

## 七、合并步骤

### Phase 1: PACS 核心（无外部依赖）

```bash
git add frontend/src/lib/compression/
git add frontend/src/lib/services/compressionSettingsService.ts
```

### Phase 2: PACS 集成（修改原有文件）

```bash
# 确认 schema.ts 中的 compression_cache 表
git add frontend/src/lib/db/schema.ts

# 确认 insightGenerationService.ts 的改动
git add frontend/src/lib/services/insightGenerationService.ts
```

### Phase 3: Kimi 服务

```bash
git add frontend/src/lib/config/apiKeys.ts
git add frontend/src/lib/services/kimiService.ts
```

### Phase 4: 导出 V2

```bash
git add frontend/src/sidepanel/utils/exportConversationsV2.ts
git add frontend/.env.example
git add frontend/.env.security.md
```

---

## 八、需要确认的问题

### 1. PACS 默认启用？

```typescript
// 当前默认设置
const DEFAULT_FLAGS = {
  useSmartCompression: true,   // 默认启用
  enableCompressionCache: true,
  enableQualityGate: true,
};
```

**建议**：默认启用，但保留开关让用户关闭

### 2. Kimi API Key 配置位置

**选项 A**: 保持独立（`.env` + Chrome Storage）
**选项 B**: 整合到 SettingsPage（推荐后续迭代）

### 3. 导出默认使用哪个？

| 方案 | 导出 Compact | 导出 Summary |
|------|-------------|--------------|
| A | Kimi | Kimi |
| B | PACS | Kimi |
| C | 用户选择 | 用户选择 |

**当前实现**：方案 A（都用 Kimi）

---

## 九、Feature Flag 汇总

```typescript
// PACS 控制
interface CompressionFeatureFlags {
  useSmartCompression: boolean;      // PACS 总开关
  compressionLevel: "auto" | "semantic" | "hierarchical" | "knowledge";
  enableCompressionCache: boolean;   // L1/L2/L3 缓存
  enableQualityGate: boolean;        // 质量门禁
  enableTelemetry: boolean;          // 指标收集
}

// Kimi 控制（通过 apiKeys.ts）
async function hasKimiApiKey(): Promise<boolean> {
  // 有 Key 且有效 → 启用 Kimi 压缩
  // 无 Key → 降级到本地压缩
}
```

---

## 十、联系方式

如有合并问题，请查看：
- PACS 设计文档：`documents/pacs/design.md`
- API 调研：`documents/pacs/api-research.md`
- 测试报告：`documents/pacs/test-report.md`

---

*文档版本: 2.0*  
*更新日期: 2026-03-16*
