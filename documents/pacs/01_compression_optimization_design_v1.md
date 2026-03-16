# VESTI 压缩机制深度优化方案

> 设计版本: v1.0  
> 创建日期: 2026-03-09  
> 状态: 设计阶段  
> 作者: AI Assistant

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [现状分析](#2-现状分析)
3. [目标架构](#3-目标架构-tacs)
4. [核心模块设计](#4-核心模块设计)
5. [应用场景矩阵](#5-应用场景矩阵)
6. [安全演进计划](#6-安全演进计划)
7. [风险评估](#7-风险评估)
8. [实施路线图](#8-实施路线图)

---

## 1. 执行摘要

### 1.1 项目背景

VESTI 当前使用单级压缩机制（Agent A Compaction），存在以下限制：
- 固定压缩率（8-15%），无法根据场景自适应
- 无质量评估机制，压缩失败无法感知
- 无缓存系统，重复压缩浪费资源
- 长文本容易超限，无分块策略

### 1.2 设计目标

构建**三级自适应压缩系统 (TACS - Tiered Adaptive Compression System)**：
- **Tier 1: Semantic Chunking** - 本地算法，<100ms，60-80% 压缩率
- **Tier 2: Hierarchical Summary** - Map-Reduce 摘要，~500ms，15-25% 压缩率
- **Tier 3: Knowledge Graph** - 结构化抽取，~1s，3-8% 压缩率
- **Quality Gate** - 四维质量评估，自动降级
- **Compression Cache** - 智能缓存，命中率 60-80%

### 1.3 关键指标

| 指标 | 当前 | 目标 | 提升 |
|------|------|------|------|
| 压缩质量 | 固定 | 自适应 3-60% | 灵活可调 |
| 长文本支持 | 易超限 | 分块+分层 | 无限制 |
| 缓存命中率 | 0% | 60-80% | 大幅提升 |
| 质量评估 | 无 | 4维评分+回退 | 可靠 |

---

## 2. 现状分析

### 2.1 现有架构

```
当前实现：
┌─────────────────────────────────────────────────────────────┐
│  单级压缩 (Agent A Compaction)                               │
│  ├─ 压缩率: 固定 8-15%                                       │
│  ├─ 策略: 单次 LLM 调用                                       │
│  ├─ 回退: 简单截断                                            │
│  └─ 问题: 无质量评估、无渐进加载、无缓存                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 代码分布

| 文件 | 功能 | 影响范围 |
|------|------|---------|
| `lib/prompts/compaction.ts` | Agent A Prompt | Summary Generation |
| `lib/services/insightGenerationService.ts` | 核心压缩逻辑 | Thread/Weekly/Network |
| `sidepanel/utils/exportConversations.ts` | 批量导出压缩 | Timeline Export |

### 2.3 数据流

```
Insight Generation Pipeline:
Capture (原始数据) → Compaction (15-30KB) → Summary (2-5KB) → Storage
   150KB/对话           Agent A压缩            结构化JSON
```

---

## 3. 目标架构 (TACS)

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TACS - Tiered Adaptive Compression System        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Tier 1: Semantic Chunking (语义分块)                                │
│  ├── 输入: Raw Conversation (100%)                                  │
│  ├── 处理: 语义边界识别 → 主题分块 → 块内去重                        │
│  ├── 输出: Semantic Chunks (60-80%)                                 │
│  └── 耗时: < 100ms (本地)                                           │
│                                                                      │
│  Tier 2: Hierarchical Summary (分层摘要)                            │
│  ├── 输入: Semantic Chunks                                          │
│  ├── 处理: Map (块级摘要) → Reduce (合并摘要) → Refine (精修)        │
│  ├── 输出: Hierarchical Summary (15-25%)                            │
│  └── 耗时: ~500ms (LLM 单次)                                        │
│                                                                      │
│  Tier 3: Knowledge Graph Extract (知识图谱抽取)                      │
│  ├── 输入: Hierarchical Summary                                     │
│  ├── 处理: Entity/Relation 抽取 → 图谱构建 → 结构化压缩             │
│  ├── 输出: Structured Knowledge (3-8%)                              │
│  └── 耗时: ~1s (LLM + 图谱推理)                                     │
│                                                                      │
│  Quality Gate: 压缩质量评估层                                        │
│  ├── 语义相似度: Cross-encoder 评分                                  │
│  ├── 信息完整性: 关键信息点检查                                       │
│  └── 自适应回退: 质量不达标时自动降级                                 │
│                                                                      │
│  Compression Cache: 智能缓存层                                       │
│  ├── 三级缓存: Memory → IndexedDB → LocalStorage                    │
│  ├── 缓存策略: LRU + TTL + 版本控制                                 │
│  └── 预期命中率: 60-80%                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块依赖关系

```
Application Layer (应用层)
├── sidepanel/utils/exportConversations.ts
├── Explore/Context Draft (Future)
└── Library/Network (Future)
         │
         ▼
API Layer (接口层)
├── lib/compression/smartCompressor.ts (统一入口)
├── Feature Flag Router
└── Backward Compatibility Adapter
         │
         ▼
Core Layer (核心层)
├── Tier 1: SemanticChunker
├── Tier 2: HierarchicalSummarizer
├── Tier 3: KnowledgeGraphExtractor
├── QualityGate
└── CompressionCache
         │
         ▼
Infrastructure Layer (基础设施层)
├── LLMService (复用现有)
├── IndexedDB (复用现有)
└── EmbeddingService (复用现有)
```

---

## 4. 核心模块设计

### 4.1 语义分块引擎 (SemanticChunker)

```typescript
// lib/compression/semanticChunker.ts

interface ChunkingConfig {
  maxChunkSize: number;      // 最大块大小 (tokens)
  minChunkSize: number;      // 最小块大小
  overlapRatio: number;      // 块间重叠比例
  respectBoundaries: boolean; // 是否尊重对话边界
}

interface SemanticChunk {
  id: string;
  startIndex: number;
  endIndex: number;
  content: string;
  embedding?: number[];
  topicTag?: string;
  importanceScore: number;
}

export class SemanticChunker {
  async chunk(messages: Message[]): Promise<SemanticChunk[]> {
    // 1. 预分块：基于对话轮次边界
    // 2. 语义合并：相似话题合并 (cosineSimilarity > 0.85)
    // 3. 重要性评分：基于信息密度
    // 4. 最终分块：确保大小限制
  }
}
```

**关键算法：**
- 语义相似度：使用现有 Embedding 服务
- 重要性信号：实体密度、问题标记、结论标记、代码块
- 复杂度：O(n log n)，纯本地计算

### 4.2 分层摘要引擎 (HierarchicalSummarizer)

```typescript
// lib/compression/hierarchicalSummarizer.ts

interface SummaryNode {
  level: number;
  sourceChunks: string[];
  summary: string;
  keyPoints: string[];
  tokenCount: number;
  confidence: number;
}

export class HierarchicalSummarizer {
  async summarize(chunks: SemanticChunk[]): Promise<HierarchicalSummary> {
    // Stage 1: Map - 并行摘要每个块
    // Stage 2: Reduce - 树形归并 (每3-4节点合并)
    // Stage 3: Refine - 精修最终摘要
  }
}
```

**关键设计：**
- Map-Reduce 模式：参考 LangChain MapReduceDocumentsChain
- 树形归并：避免线性归并的信息丢失
- 置信度传递：子节点置信度影响父节点

### 4.3 知识图谱抽取引擎 (KGExtractor)

```typescript
// lib/compression/kgExtractor.ts

interface ConversationGraph {
  entities: Entity[];
  relations: Relation[];
  centralTopic?: string;
  unresolvedQuestions: string[];
  keyDecisions: string[];
}

export class KnowledgeGraphExtractor {
  async extract(summary: string, messages: Message[]): Promise<ConversationGraph>;
  async toMarkdown(graph: ConversationGraph): Promise<string>;
}
```

**输出格式：**
```markdown
## Knowledge Graph Summary
**Central Topic:** React Performance Optimization

### Key Decisions
- Use useMemo for expensive calculations
- Implement virtual scrolling for long lists

### Core Concepts
- **useMemo** (technology)
- **Virtual Scrolling** (technology)
- **Render Optimization** (concept)

### Open Questions
- How to handle dynamic imports?
```

### 4.4 质量评估门 (QualityGate)

```typescript
// lib/compression/qualityGate.ts

interface QualityMetrics {
  semanticSimilarity: number;  // 与原文语义相似度 (cross-encoder)
  informationRetention: number; // 信息保留率
  coherence: number;            // 连贯性评分
  readability: number;          // 可读性评分
}

export class CompressionQualityGate {
  async evaluate(original, compressed, level): Promise<CompressionResult> {
    // 计算四维评分
    // 与阈值比较
    // 不通过则触发降级
  }
}
```

**阈值设置：**
| 级别 | 语义相似度 | 信息保留率 | 连贯性 |
|------|-----------|-----------|--------|
| Tier 1 | ≥ 0.90 | ≥ 0.80 | ≥ 0.85 |
| Tier 2 | ≥ 0.85 | ≥ 0.70 | ≥ 0.80 |
| Tier 3 | ≥ 0.80 | ≥ 0.60 | ≥ 0.75 |

### 4.5 压缩缓存系统 (CompressionCache)

```typescript
// lib/compression/compressionCache.ts

interface CompressionCacheEntry {
  conversationId: number;
  version: string;
  level: CompressionLevel;
  result: CompressionResult;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
}

export class CompressionCache {
  async get(conversationId, level): Promise<CompressionResult | null>;
  async set(conversationId, level, result): Promise<void>;
  // LRU 清理策略
}
```

**存储策略：**
- Primary: IndexedDB (大容量)
- Backup: Memory Cache (快速访问)
- TTL: 7天默认，可配置
- 版本控制：Prompt 变更时自动失效

### 4.6 统一入口 (SmartCompressor)

```typescript
// lib/compression/smartCompressor.ts

export interface SmartCompressionOptions {
  targetLevel: 'semantic' | 'hierarchical' | 'knowledge';
  maxOutputTokens?: number;
  qualityThreshold?: number;
  useCache?: boolean;
}

export class SmartCompressor {
  async compress(
    messages: Message[],
    options: SmartCompressionOptions
  ): Promise<CompressionResult> {
    // 1. 检查缓存
    // 2. 根据 targetLevel 选择策略
    // 3. 执行压缩
    // 4. 质量评估
    // 5. 缓存结果
    // 6. 返回（可能包含降级结果）
  }
}
```

---

## 5. 应用场景矩阵

### 5.1 功能映射

| 功能模块 | 当前压缩 | 优化后 | 收益 |
|---------|---------|--------|------|
| **Explore Context Draft** | Agent A (固定) | Tier 2 自适应 | 质量提升 3x |
| **Library Card 摘要** | snippet (截取) | Tier 1 语义摘要 | 更准确 |
| **批量导出 Compact** | 简单截断 | Tier 2 分层 | 结构化 |
| **批量导出 Summary** | 无 | Tier 3 图谱 | 洞察化 |
| **Network 节点摘要** | 简单聚合 | Tier 3 图谱 | 关联化 |
| **存储自动归档** | 无 | Tier 2 自动 | 省 60-80% 空间 |

### 5.2 导出场景细分

| 场景 | 推荐级别 | 预期大小 | 用途 |
|------|---------|---------|------|
| 导入 Notion | Tier 2 | 20-30% | 保留结构，便于编辑 |
| 粘贴到 Claude | Tier 2 + 优化 | 15-20% | 适配上下文窗口 |
| 邮件分享 | Tier 1 | 40-50% | 快速预览 |
| 生成周报 | Tier 3 | 5-10% | 宏观洞察 |
| 代码归档 | Tier 2 (保留代码) | 25-35% | 技术完整 |
| 合规存档 | Tier 0 (原始) | 100% | 不可压缩 |

### 5.3 渐进式加载体验

```
用户点击 Compact Export:
┌─────────────────────────────────────────┐
│  正在压缩 3 个对话...                    │
│  ━━━━━━━━━━━━╺━━━  80%                 │
│                                         │
│  对话 1: Semantic Chunking ✓            │
│  对话 2: Hierarchical Summary ✓         │
│  对话 3: Quality Check...               │
│                                         │
│  [取消]  [后台运行]                     │
└─────────────────────────────────────────┘
```

---

## 6. 安全演进计划

### 6.1 核心原则

1. **绝不修改现有核心代码** - 新功能使用新接口
2. **完全隔离新系统** - 新目录、新接口、新缓存
3. **渐进式切换** - Sidepanel → Insights → Weekly → 全局
4. **可秒级回滚** - Feature Flag 控制

### 6.2 演进阶段

```
Phase 0: 现状保持
├── lib/prompts/compaction.ts ✅ 不动
├── insightGenerationService.ts ✅ 不动
└── 所有现有功能正常工作

Phase 1: 新增并行系统 (本周)
├── lib/compression/ ← 新目录
│   ├── semanticChunker.ts
│   ├── hierarchicalSummarizer.ts
│   ├── kgExtractor.ts
│   ├── qualityGate.ts
│   ├── compressionCache.ts
│   └── smartCompressor.ts
└── lib/prompts/smartCompression/ ← 新目录

Phase 2: Sidepanel 集成 (下周)
├── sidepanel/utils/exportConversations.ts
│   └── 调用 smartCompressor (新系统)
└── 现有功能继续使用旧系统

Phase 3: Feature Flag 灰度 (2周后)
├── insightGenerationService.ts
│   └── if (featureFlag.useSmartCompression)
│         ? smartCompressor.compress()
│         : runCompaction() (旧系统)
└── 灰度发布，可秒级回滚

Phase 4: 完全迁移 (1月后)
├── 移除旧系统代码
└── 保留接口兼容层
```

### 6.3 向后兼容保证

```typescript
// 这些接口必须保持兼容

// 1. Prompt 系统
getPrompt("compaction", { variant: "current" }) // 必须继续工作

// 2. Summary 生成入口
generateSummary(conversationId, settings, hooks) // 签名不变

// 3. 数据库存储格式
ConversationSummaryV2 {
  compactionUsed: boolean;
  compactionFailed: boolean;
  compactionCharsIn: number;
  compactionCharsOut: number;
  // 可新增字段，不可删除/修改
}
```

---

## 7. 风险评估

### 7.1 高风险区域

| 风险点 | 影响 | 概率 | 缓解措施 |
|--------|------|------|---------|
| 修改 `runCompaction()` | 所有摘要失败 | 高 | **不修改**，使用包装器模式 |
| 修改 Prompt 结构 | 输出格式不兼容 | 高 | 使用 Prompt Version 系统 |
| 修改类型定义 | 编译错误 | 中 | 接口继承，保持兼容 |
| 修改核心服务 | Summary 异常 | 高 | Feature Flag，灰度发布 |

### 7.2 降级策略

```typescript
// 自动降级链
Tier 3 (KG) ──失败──▶ Tier 2 (Hierarchical) ──失败──▶ Tier 1 (Semantic) ──失败──▶ Original

// 触发条件
if (qualityScore < threshold || latency > timeout || llmError) {
  return fallbackToLowerTier();
}
```

### 7.3 监控指标

```typescript
telemetry.track('compression.used', {
  level: result.level,
  qualityScore: result.metrics.semanticSimilarity,
  latency: result.metrics.processingTime,
  fallbackUsed: !!result.fallbackResult,
  cacheHit: boolean,
});

// 自动回滚条件
if (failureRate > 0.05 || avgQualityScore < 0.7) {
  featureFlagService.disable('useSmartCompression');
}
```

---

## 8. 实施路线图

### Phase 1: 基础框架 (Week 1)

| 任务 | 时间 | 产出 |
|------|------|------|
| 创建目录结构 | 0.5d | `lib/compression/`, `lib/prompts/smartCompression/` |
| 定义类型接口 | 0.5d | `types.ts`, `interfaces.ts` |
| 实现 SemanticChunker | 1.5d | Tier 1 完整实现 + 单元测试 |
| 实现 CompressionCache | 1d | 缓存层 + IndexedDB 集成 |
| 代码审查 | 0.5d | PR Review |

**风险等级：** 🟢 极低  
**回滚时间：** 即时 (未集成到任何功能)

### Phase 2: Sidepanel 集成 (Week 2)

| 任务 | 时间 | 产出 |
|------|------|------|
| 实现 SmartCompressor 入口 | 1d | 统一 API 层 |
| 实现 HierarchicalSummarizer | 1.5d | Tier 2 + Prompt |
| 集成到 ExportDialog | 1d | Compact 模式使用新系统 |
| 端到端测试 | 0.5d | 批量导出功能验证 |

**风险等级：** 🟢 低  
**回滚时间：** 1分钟 (仅影响批量导出)

### Phase 3: 质量与监控 (Week 3)

| 任务 | 时间 | 产出 |
|------|------|------|
| 实现 QualityGate | 1.5d | 4维评估 + 降级策略 |
| 实现埋点监控 | 1d | Telemetry 集成 |
| 实现 Feature Flag | 0.5d | 灰度控制 |
| 压力测试 | 0.5d | 性能基准 |

**风险等级：** 🟡 中  
**回滚时间：** 秒级 (Feature Flag)

### Phase 4: 核心功能迁移 (Week 4-6)

| 任务 | 时间 | 产出 |
|------|------|------|
| insightGenerationService 集成 | 2d | 包装器 + Feature Flag |
| Weekly Digest 优化 | 1.5d | 多对话压缩优化 |
| Network 节点摘要 | 1.5d | Tier 3 集成 |
| A/B 测试 | 1d | 新旧系统对比 |

**风险等级：** 🟡 中  
**回滚时间：** 秒级

### Phase 5: 完善与清理 (Week 7-8)

| 任务 | 时间 | 产出 |
|------|------|------|
| 实现 KGExtractor | 2d | Tier 3 完整实现 |
| 存储自动压缩 | 1.5d | 后台任务 |
| 移除旧系统 | 1d | 清理 deprecated 代码 |
| 文档更新 | 0.5d | 开发者文档 |

**风险等级：** 🟢 低  
**回滚时间：** N/A (最终阶段)

---

## 附录

### A. 参考架构

- **LangChain**: MapReduceDocumentsChain, RefineDocumentsChain
- **LlamaIndex**: ResponseSynthesizer, TreeSummarize
- **Vercel AI SDK**: Streaming, AI Tools
- **Google Research**: SummAE, TLDR

### B. 性能基准

| 操作 | 目标延迟 | 目标吞吐量 |
|------|---------|-----------|
| Tier 1 (Semantic) | < 100ms | 100 ops/s |
| Tier 2 (Hierarchical) | < 1s | 10 ops/s |
| Tier 3 (KG) | < 2s | 5 ops/s |
| Cache Lookup | < 10ms | 1000 ops/s |

### C. 术语表

| 术语 | 说明 |
|------|------|
| TACS | Tiered Adaptive Compression System |
| Semantic Chunking | 基于语义的文本分块 |
| Map-Reduce | 分块处理再合并的策略 |
| Cross-Encoder | 用于精确相似度计算的模型 |
| Feature Flag | 功能开关，用于灰度发布 |
| Shadow Mode | 影子模式，并行运行但不影响主流程 |

---

## 文档历史

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| v1.0 | 2026-03-09 | 初始版本，完整设计方案 |

---

*本设计方案遵循"完全隔离、渐进演进、可回滚"原则，确保在大型架构中安全实施。*
