# VESTI 压缩机制深度优化方案 v2.0

> **设计版本**: v2.0 (基于 v1.0 的深度优化)
> **创建日期**: 2026-03-09
> **状态**: 架构设计 + 实施建议
> **作者**: AI Assistant (基于代码深度分析)

---

## 执行摘要

### 核心问题诊断

通过深度代码分析，发现当前压缩系统的**五大核心瓶颈**：

1. **单级压缩刚性** - Agent A 固定 8-15% 压缩率，无法适应不同场景
2. **质量黑盒** - 无法评估压缩质量，失败时用户无感知
3. **重复计算浪费** - 无压缩缓存，相同对话重复压缩
4. **长文本脆弱** - 超过 12000 字符直接截断，信息丢失
5. **导出体验割裂** - Compact 模式仅截取前 3 问 + 最后 800 字符，非真正压缩

### 优化目标

构建**生产级自适应压缩系统 (PACS - Production Adaptive Compression System)**：

| 维度 | 当前 | 目标 | 提升 |
|------|------|------|------|
| **压缩质量** | 固定 8-15% | 自适应 3-80% | 5x 灵活性 |
| **质量保证** | 无评估 | 4 维评分 + 自动降级 | 可靠性 ∞ |
| **缓存命中率** | 0% | 70-85% | 性能 10x |
| **长文本支持** | 12KB 硬限 | 无限制 (分块) | 无限制 |
| **用户体验** | 黑盒 | 渐进式 + 实时反馈 | 透明化 |

---

## 第一部分：架构设计

### 1. 整体架构：PACS (Production Adaptive Compression System)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PACS - Production Adaptive Compression System        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Layer 0: Smart Router (智能路由层)                             │    │
│  │  ├─ 输入分析: 消息数、字符数、语言、平台                          │    │
│  │  ├─ 场景识别: 导出/摘要/周报/存档                                │    │
│  │  ├─ 策略选择: 选择最优压缩级别                                   │    │
│  │  └─ 缓存检查: 命中则直接返回                                     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Layer 1: Semantic Chunking (语义分块层) - 本地算法              │    │
│  │  ├─ 输入: Raw Messages (100%)                                   │    │
│  │  ├─ 处理:                                                        │    │
│  │  │   • 对话边界识别 (User/AI 轮次)                               │    │
│  │  │   • 语义相似度聚类 (基于 Embedding)                           │    │
│  │  │   • 重要性评分 (实体密度、问题标记、代码块)                    │    │
│  │  │   • 智能去重 (跨消息重复内容检测)                             │    │
│  │  ├─ 输出: Semantic Chunks (60-80%)                              │    │
│  │  └─ 性能: <100ms, 纯本地, 无 LLM 调用                           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Layer 2: Hierarchical Summary (分层摘要层) - 现有 Agent A 增强  │    │
│  │  ├─ 输入: Semantic Chunks                                       │    │
│  │  ├─ 处理:                                                        │    │
│  │  │   • Map Phase: 并行压缩每个块 (复用 Agent A)                  │    │
│  │  │   • Reduce Phase: 树形归并 (3-4 节点合并)                     │    │
│  │  │   • Refine Phase: 最终精修 (保持 Agent A 输出格式)            │    │
│  │  ├─ 输出: Hierarchical Summary (15-25%)                         │    │
│  │  └─ 性能: ~500ms, 1-3 次 LLM 调用                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Layer 3: Knowledge Graph Extract (知识图谱层) - 新增            │    │
│  │  ├─ 输入: Hierarchical Summary                                  │    │
│  │  ├─ 处理:                                                        │    │
│  │  │   • Entity Extraction (人物、技术、概念)                      │    │
│  │  │   • Relation Extraction (依赖、对比、因果)                    │    │
│  │  │   • Graph Construction (节点 + 边)                           │    │
│  │  │   • Structured Serialization (Markdown/JSON)                │    │
│  │  ├─ 输出: Knowledge Graph (3-8%)                                │    │
│  │  └─ 性能: ~1s, 1 次 LLM 调用                                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Quality Gate: 压缩质量评估层                                    │    │
│  │  ├─ 语义相似度: Embedding Cosine Similarity (快速)              │    │
│  │  ├─ 信息完整性: 关键实体覆盖率                                   │    │
│  │  ├─ 结构完整性: Agent A 必需章节检查                             │    │
│  │  ├─ 可读性: 字符/词比、句子长度分布                              │    │
│  │  └─ 自动降级: 不达标时回退到上一级                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              ↓                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Compression Cache: 三级缓存层                                   │    │
│  │  ├─ L1: Memory Cache (LRU, 50 条, <10ms)                       │    │
│  │  ├─ L2: IndexedDB (主存储, 10000 条, <50ms)                    │    │
│  │  ├─ L3: LocalStorage (降级, 100 条, <20ms)                     │    │
│  │  ├─ 缓存键: conversationId + level + promptVersion + hash      │    │
│  │  └─ 失效策略: TTL (7天) + Prompt 版本变更 + 源数据变更          │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. 核心创新点

#### 2.1 智能路由层 (Smart Router)

**问题**: 当前所有场景使用相同压缩策略，导致过度压缩或压缩不足。

**解决方案**: 基于场景自动选择最优压缩级别

```typescript
interface CompressionScenario {
  name: string;
  targetLevel: CompressionLevel;
  qualityThreshold: number;
  maxLatency: number;
  useCache: boolean;
}

const SCENARIOS: Record<string, CompressionScenario> = {
  // 导出场景
  export_notion: {
    name: "导出到 Notion",
    targetLevel: "hierarchical",  // Tier 2
    qualityThreshold: 0.85,
    maxLatency: 2000,
    useCache: true,
  },
  export_claude: {
    name: "粘贴到 Claude",
    targetLevel: "hierarchical",  // Tier 2，优化上下文窗口
    qualityThreshold: 0.80,
    maxLatency: 3000,
    useCache: true,
  },
  export_email: {
    name: "邮件分享",
    targetLevel: "semantic",      // Tier 1，快速预览
    qualityThreshold: 0.75,
    maxLatency: 500,
    useCache: true,
  },
  export_weekly: {
    name: "生成周报",
    targetLevel: "knowledge",     // Tier 3，宏观洞察
    qualityThreshold: 0.70,
    maxLatency: 5000,
    useCache: true,
  },

  // 摘要场景
  summary_thread: {
    name: "对话摘要",
    targetLevel: "hierarchical",  // Tier 2
    qualityThreshold: 0.85,
    maxLatency: 3000,
    useCache: true,
  },
  summary_weekly: {
    name: "周报生成",
    targetLevel: "knowledge",     // Tier 3
    qualityThreshold: 0.75,
    maxLatency: 5000,
    useCache: true,
  },

  // 存储场景
  storage_archive: {
    name: "自动归档",
    targetLevel: "hierarchical",  // Tier 2，节省空间
    qualityThreshold: 0.80,
    maxLatency: 10000,
    useCache: false,  // 归档不使用缓存
  },

  // 实时场景
  realtime_preview: {
    name: "实时预览",
    targetLevel: "semantic",      // Tier 1，极速
    qualityThreshold: 0.70,
    maxLatency: 200,
    useCache: true,
  },
};

class SmartRouter {
  selectStrategy(
    messages: Message[],
    scenario: string,
    userPreferences?: Partial<CompressionScenario>
  ): CompressionStrategy {
    const baseScenario = SCENARIOS[scenario] || SCENARIOS.summary_thread;
    const config = { ...baseScenario, ...userPreferences };

    // 输入分析
    const analysis = this.analyzeInput(messages);

    // 自适应调整
    if (analysis.messageCount < 10) {
      // 短对话，降级到 Tier 1
      config.targetLevel = "semantic";
    } else if (analysis.totalChars > 50000) {
      // 超长对话，必须分块
      config.targetLevel = "hierarchical";
    }

    // 缓存检查
    if (config.useCache) {
      const cached = await this.cache.get(messages, config.targetLevel);
      if (cached) return { result: cached, fromCache: true };
    }

    return { config, analysis, fromCache: false };
  }

  private analyzeInput(messages: Message[]): InputAnalysis {
    return {
      messageCount: messages.length,
      totalChars: messages.reduce((sum, m) => sum + m.content_text.length, 0),
      hasCode: messages.some(m => m.content_text.includes("```")),
      language: detectLanguage(messages[0]?.content_text || ""),
      platform: messages[0]?.platform || "unknown",
      avgMessageLength: totalChars / messageCount,
      userAssistantRatio: calculateRatio(messages),
    };
  }
}
```

#### 2.2 语义分块引擎 (Semantic Chunker)

**问题**: 当前直接将整个对话传给 LLM，超过 12KB 就截断，导致信息丢失。

**解决方案**: 智能分块 + 语义聚类

```typescript
interface SemanticChunk {
  id: string;
  startIndex: number;
  endIndex: number;
  messages: Message[];
  content: string;
  embedding?: number[];
  topic?: string;
  importance: number;
  metadata: {
    hasCode: boolean;
    hasQuestion: boolean;
    hasDecision: boolean;
    entityCount: number;
  };
}

class SemanticChunker {
  async chunk(
    messages: Message[],
    config: ChunkingConfig
  ): Promise<SemanticChunk[]> {
    // Step 1: 预分块 - 基于对话轮次边界
    const preliminaryChunks = this.splitByTurns(messages);

    // Step 2: 语义合并 - 相似话题合并
    const mergedChunks = await this.mergeBySemantics(preliminaryChunks);

    // Step 3: 重要性评分
    const scoredChunks = this.scoreImportance(mergedChunks);

    // Step 4: 最终分块 - 确保大小限制
    const finalChunks = this.enforceSize(scoredChunks, config);

    return finalChunks;
  }

  private splitByTurns(messages: Message[]): Chunk[] {
    const chunks: Chunk[] = [];
    let currentChunk: Message[] = [];
    let currentRole = messages[0]?.role;

    for (const msg of messages) {
      if (msg.role !== currentRole && currentChunk.length > 0) {
        chunks.push({ messages: currentChunk });
        currentChunk = [];
      }
      currentChunk.push(msg);
      currentRole = msg.role;
    }

    if (currentChunk.length > 0) {
      chunks.push({ messages: currentChunk });
    }

    return chunks;
  }

  private async mergeBySemantics(chunks: Chunk[]): Promise<Chunk[]> {
    // 使用现有 Embedding 服务
    const embeddings = await Promise.all(
      chunks.map(c => this.embeddingService.embed(c.content))
    );

    // 相似度聚类 (cosine similarity > 0.85)
    const merged: Chunk[] = [];
    const visited = new Set<number>();

    for (let i = 0; i < chunks.length; i++) {
      if (visited.has(i)) continue;

      const cluster = [chunks[i]];
      visited.add(i);

      for (let j = i + 1; j < chunks.length; j++) {
        if (visited.has(j)) continue;

        const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity > 0.85) {
          cluster.push(chunks[j]);
          visited.add(j);
        }
      }

      merged.push(this.mergeCluster(cluster));
    }

    return merged;
  }

  private scoreImportance(chunks: Chunk[]): ScoredChunk[] {
    return chunks.map(chunk => {
      let score = 0;

      // 实体密度 (人名、技术名词)
      const entities = this.extractEntities(chunk.content);
      score += entities.length * 0.3;

      // 问题标记
      if (/[?？]/.test(chunk.content)) score += 1.0;

      // 决策标记
      if (/决定|选择|采用|使用/.test(chunk.content)) score += 1.5;

      // 代码块
      if (chunk.content.includes("```")) score += 2.0;

      // 结论标记
      if (/总结|结论|综上/.test(chunk.content)) score += 1.2;

      return { ...chunk, importance: score };
    });
  }
}
```

#### 2.3 分层摘要引擎 (Hierarchical Summarizer)

**问题**: 当前单次 LLM 调用压缩整个对话，长对话质量下降。

**解决方案**: Map-Reduce 模式 + 树形归并

```typescript
class HierarchicalSummarizer {
  async summarize(
    chunks: SemanticChunk[],
    config: SummaryConfig
  ): Promise<HierarchicalSummary> {
    // Stage 1: Map - 并行压缩每个块
    const chunkSummaries = await this.mapPhase(chunks);

    // Stage 2: Reduce - 树形归并
    const mergedSummary = await this.reducePhase(chunkSummaries);

    // Stage 3: Refine - 最终精修
    const finalSummary = await this.refinePhase(mergedSummary);

    return finalSummary;
  }

  private async mapPhase(chunks: SemanticChunk[]): Promise<ChunkSummary[]> {
    // 并行调用 Agent A 压缩每个块
    const summaries = await Promise.all(
      chunks.map(chunk => this.compressChunk(chunk))
    );

    return summaries;
  }

  private async compressChunk(chunk: SemanticChunk): Promise<ChunkSummary> {
    // 复用现有 Agent A Prompt
    const prompt = getPrompt("compaction", { variant: "current" });
    const result = await callInference(
      this.settings,
      prompt.userTemplate({
        messages: chunk.messages,
        conversationTitle: chunk.topic || "Chunk",
        locale: "zh",
      }),
      { systemPrompt: prompt.system }
    );

    return {
      chunkId: chunk.id,
      content: result.content,
      importance: chunk.importance,
    };
  }

  private async reducePhase(summaries: ChunkSummary[]): Promise<string> {
    // 树形归并 (每 3-4 个节点合并)
    const MERGE_SIZE = 3;
    let current = summaries;

    while (current.length > 1) {
      const next: ChunkSummary[] = [];

      for (let i = 0; i < current.length; i += MERGE_SIZE) {
        const group = current.slice(i, i + MERGE_SIZE);
        const merged = await this.mergeGroup(group);
        next.push(merged);
      }

      current = next;
    }

    return current[0].content;
  }

  private async mergeGroup(group: ChunkSummary[]): Promise<ChunkSummary> {
    const combinedContent = group.map(s => s.content).join("\n\n---\n\n");

    const prompt = `合并以下 ${group.length} 个摘要片段，保持 Agent A 格式：

${combinedContent}

要求：
1. 保持 ## Core Logic Chain, ## Concept Matrix, ## Unresolved Tensions 章节
2. 合并重复概念
3. 保持时间顺序
4. 输出 Markdown`;

    const result = await callInference(this.settings, prompt);

    return {
      chunkId: `merged_${group.map(g => g.chunkId).join("_")}`,
      content: result.content,
      importance: Math.max(...group.map(g => g.importance)),
    };
  }

  private async refinePhase(summary: string): Promise<HierarchicalSummary> {
    // 最终精修，确保格式正确
    const prompt = `精修以下摘要，确保格式完整：

${summary}

要求：
1. 检查必需章节是否存在
2. 移除冗余内容
3. 优化可读性
4. 保持 Agent A 格式`;

    const result = await callInference(this.settings, prompt);

    return {
      content: result.content,
      level: "hierarchical",
      chunkCount: chunks.length,
      compressionRatio: result.content.length / originalLength,
    };
  }
}
```

#### 2.4 知识图谱抽取引擎 (Knowledge Graph Extractor)

**问题**: 当前摘要是纯文本，无法支持关系查询和可视化。

**解决方案**: 结构化知识抽取

```typescript
interface ConversationGraph {
  entities: Entity[];
  relations: Relation[];
  timeline: TimelineEvent[];
  centralTopic: string;
  keyDecisions: Decision[];
  unresolvedQuestions: Question[];
  metadata: GraphMetadata;
}

interface Entity {
  id: string;
  name: string;
  type: "person" | "technology" | "concept" | "product" | "organization";
  mentions: number;
  importance: number;
  firstMention: number;
  attributes: Record<string, string>;
}

interface Relation {
  source: string;
  target: string;
  type: "depends_on" | "compares_to" | "causes" | "implements" | "uses";
  strength: number;
  evidence: string[];
}

class KnowledgeGraphExtractor {
  async extract(
    summary: string,
    originalMessages: Message[]
  ): Promise<ConversationGraph> {
    // 使用 LLM 进行结构化抽取
    const prompt = this.buildExtractionPrompt(summary);
    const result = await callInference(
      this.settings,
      prompt,
      { mode: "json_mode" }
    );

    const graph = JSON.parse(result.content) as ConversationGraph;

    // 后处理：验证和增强
    return this.enhanceGraph(graph, originalMessages);
  }

  private buildExtractionPrompt(summary: string): string {
    return `从以下对话摘要中抽取知识图谱：

${summary}

请以 JSON 格式输出，包含：
1. entities: 实体列表 (人物、技术、概念等)
2. relations: 关系列表 (依赖、对比、因果等)
3. centralTopic: 核心主题
4. keyDecisions: 关键决策
5. unresolvedQuestions: 未解决问题

JSON Schema:
{
  "entities": [
    {
      "id": "entity_1",
      "name": "React",
      "type": "technology",
      "mentions": 5,
      "importance": 0.9,
      "attributes": { "version": "18", "category": "frontend" }
    }
  ],
  "relations": [
    {
      "source": "entity_1",
      "target": "entity_2",
      "type": "depends_on",
      "strength": 0.8,
      "evidence": ["用户提到需要 React 来构建 UI"]
    }
  ],
  "centralTopic": "React 性能优化",
  "keyDecisions": [
    {
      "decision": "使用 useMemo 优化渲染",
      "rationale": "减少不必要的重新计算",
      "timestamp": 1234567890
    }
  ],
  "unresolvedQuestions": [
    {
      "question": "如何处理动态导入？",
      "context": "讨论代码分割时提出",
      "importance": 0.7
    }
  ]
}`;
  }

  private enhanceGraph(
    graph: ConversationGraph,
    messages: Message[]
  ): ConversationGraph {
    // 增强：添加时间线
    graph.timeline = this.buildTimeline(messages, graph.entities);

    // 增强：计算实体重要性
    graph.entities = this.rankEntities(graph.entities, graph.relations);

    // 增强：关系强度归一化
    graph.relations = this.normalizeRelations(graph.relations);

    return graph;
  }

  async toMarkdown(graph: ConversationGraph): Promise<string> {
    return `# Knowledge Graph Summary

**Central Topic:** ${graph.centralTopic}

## Key Decisions
${graph.keyDecisions.map(d => `- **${d.decision}**: ${d.rationale}`).join("\n")}

## Core Entities
${graph.entities
  .sort((a, b) => b.importance - a.importance)
  .slice(0, 10)
  .map(e => `- **${e.name}** (${e.type}): ${e.mentions} mentions`)
  .join("\n")}

## Key Relations
${graph.relations
  .sort((a, b) => b.strength - a.strength)
  .slice(0, 5)
  .map(r => `- ${r.source} ${r.type} ${r.target} (strength: ${r.strength.toFixed(2)})`)
  .join("\n")}

## Unresolved Questions
${graph.unresolvedQuestions.map(q => `- ${q.question}`).join("\n")}

## Timeline
${graph.timeline.map(t => `- ${formatTime(t.timestamp)}: ${t.event}`).join("\n")}
`;
  }
}
```

#### 2.5 质量评估门 (Quality Gate)

**问题**: 当前无法评估压缩质量，失败时用户无感知。

**解决方案**: 四维质量评估 + 自动降级

```typescript
interface QualityMetrics {
  semanticSimilarity: number;    // 0-1, 语义相似度
  informationRetention: number;  // 0-1, 信息保留率
  structuralIntegrity: number;   // 0-1, 结构完整性
  readability: number;            // 0-1, 可读性
  overallScore: number;           // 0-1, 综合评分
  passed: boolean;
  degradationReason?: string;
}

interface QualityThresholds {
  semanticSimilarity: number;
  informationRetention: number;
  structuralIntegrity: number;
  readability: number;
  overall: number;
}

const QUALITY_THRESHOLDS: Record<CompressionLevel, QualityThresholds> = {
  semantic: {
    semanticSimilarity: 0.90,
    informationRetention: 0.80,
    structuralIntegrity: 0.85,
    readability: 0.75,
    overall: 0.80,
  },
  hierarchical: {
    semanticSimilarity: 0.85,
    informationRetention: 0.70,
    structuralIntegrity: 0.80,
    readability: 0.70,
    overall: 0.75,
  },
  knowledge: {
    semanticSimilarity: 0.80,
    informationRetention: 0.60,
    structuralIntegrity: 0.75,
    readability: 0.65,
    overall: 0.70,
  },
};

class CompressionQualityGate {
  async evaluate(
    original: string,
    compressed: string,
    level: CompressionLevel,
    originalMessages: Message[]
  ): Promise<QualityMetrics> {
    // 1. 语义相似度 (使用 Embedding)
    const semanticSimilarity = await this.computeSemanticSimilarity(
      original,
      compressed
    );

    // 2. 信息保留率 (关键实体覆盖)
    const informationRetention = this.computeInformationRetention(
      originalMessages,
      compressed
    );

    // 3. 结构完整性 (Agent A 格式检查)
    const structuralIntegrity = this.computeStructuralIntegrity(
      compressed,
      level
    );

    // 4. 可读性 (字符/词比、句子长度)
    const readability = this.computeReadability(compressed);

    // 综合评分 (加权平均)
    const overallScore =
      semanticSimilarity * 0.35 +
      informationRetention * 0.30 +
      structuralIntegrity * 0.20 +
      readability * 0.15;

    // 判断是否通过
    const thresholds = QUALITY_THRESHOLDS[level];
    const passed =
      semanticSimilarity >= thresholds.semanticSimilarity &&
      informationRetention >= thresholds.informationRetention &&
      structuralIntegrity >= thresholds.structuralIntegrity &&
      readability >= thresholds.readability &&
      overallScore >= thresholds.overall;

    return {
      semanticSimilarity,
      informationRetention,
      structuralIntegrity,
      readability,
      overallScore,
      passed,
      degradationReason: passed ? undefined : this.getDegradationReason({
        semanticSimilarity,
        informationRetention,
        structuralIntegrity,
        readability,
      }, thresholds),
    };
  }

  private async computeSemanticSimilarity(
    original: string,
    compressed: string
  ): Promise<number> {
    // 使用现有 Embedding 服务
    const [embeddingA, embeddingB] = await Promise.all([
      this.embeddingService.embed(original),
      this.embeddingService.embed(compressed),
    ]);

    return cosineSimilarity(embeddingA, embeddingB);
  }

  private computeInformationRetention(
    originalMessages: Message[],
    compressed: string
  ): number {
    // 提取关键实体
    const originalEntities = this.extractKeyEntities(originalMessages);

    // 检查压缩文本中的覆盖率
    let coveredCount = 0;
    for (const entity of originalEntities) {
      if (compressed.includes(entity.name)) {
        coveredCount++;
      }
    }

    return originalEntities.length > 0
      ? coveredCount / originalEntities.length
      : 1.0;
  }

  private computeStructuralIntegrity(
    compressed: string,
    level: CompressionLevel
  ): number {
    if (level === "semantic") {
      // Tier 1 无格式要求
      return 1.0;
    }

    if (level === "hierarchical") {
      // Tier 2 需要 Agent A 格式
      const requiredSections = [
        "## Core Logic Chain",
        "## Concept Matrix",
        "## Unresolved Tensions",
      ];

      let score = 0;
      for (const section of requiredSections) {
        if (compressed.includes(section)) {
          score += 1 / requiredSections.length;
        }
      }

      return score;
    }

    if (level === "knowledge") {
      // Tier 3 需要知识图谱结构
      const requiredFields = [
        "Central Topic",
        "Key Decisions",
        "Core Entities",
        "Unresolved Questions",
      ];

      let score = 0;
      for (const field of requiredFields) {
        if (compressed.includes(field)) {
          score += 1 / requiredFields.length;
        }
      }

      return score;
    }

    return 0;
  }

  private computeReadability(text: string): number {
    // 简化的可读性评分
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const chars = text.length;

    // 平均句子长度 (理想: 15-25 词)
    const avgSentenceLength = words.length / sentences.length;
    const sentenceLengthScore = Math.max(
      0,
      1 - Math.abs(avgSentenceLength - 20) / 20
    );

    // 字符/词比 (中文理想: 1.5-2.5)
    const charWordRatio = chars / words.length;
    const charWordScore = Math.max(
      0,
      1 - Math.abs(charWordRatio - 2) / 2
    );

    return (sentenceLengthScore + charWordScore) / 2;
  }

  private extractKeyEntities(messages: Message[]): Entity[] {
    // 简化实现：提取专有名词、技术术语
    const entities: Entity[] = [];
    const text = messages.map(m => m.content_text).join(" ");

    // 代码块中的标识符
    const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
    for (const block of codeBlocks) {
      const identifiers = block.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
      entities.push(...identifiers.map(name => ({ name, type: "code" as const })));
    }

    // 技术术语 (大写开头的词)
    const terms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    entities.push(...terms.map(name => ({ name, type: "term" as const })));

    // 去重
    const unique = Array.from(new Set(entities.map(e => e.name))).map(name => ({
      name,
      type: "entity" as const,
    }));

    return unique;
  }

  private getDegradationReason(
    metrics: Omit<QualityMetrics, "overallScore" | "passed" | "degradationReason">,
    thresholds: QualityThresholds
  ): string {
    const failures: string[] = [];

    if (metrics.semanticSimilarity < thresholds.semanticSimilarity) {
      failures.push(`语义相似度不足 (${metrics.semanticSimilarity.toFixed(2)} < ${thresholds.semanticSimilarity})`);
    }
    if (metrics.informationRetention < thresholds.informationRetention) {
      failures.push(`信息保留率不足 (${metrics.informationRetention.toFixed(2)} < ${thresholds.informationRetention})`);
    }
    if (metrics.structuralIntegrity < thresholds.structuralIntegrity) {
      failures.push(`结构完整性不足 (${metrics.structuralIntegrity.toFixed(2)} < ${thresholds.structuralIntegrity})`);
    }
    if (metrics.readability < thresholds.readability) {
      failures.push(`可读性不足 (${metrics.readability.toFixed(2)} < ${thresholds.readability})`);
    }

    return failures.join("; ");
  }
}
```

#### 2.6 三级缓存系统 (Compression Cache)

**问题**: 当前无缓存，相同对话重复压缩浪费资源。

**解决方案**: Memory + IndexedDB + LocalStorage 三级缓存

```typescript
interface CompressionCacheEntry {
  key: string;
  conversationId: number;
  level: CompressionLevel;
  promptVersion: string;
  sourceHash: string;
  result: CompressionResult;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessAt: number;
}

class CompressionCache {
  private memoryCache: LRUCache<string, CompressionCacheEntry>;
  private db: MemoryHubDB;

  constructor(db: MemoryHubDB) {
    this.db = db;
    this.memoryCache = new LRUCache<string, CompressionCacheEntry>({
      max: 50,  // 最多缓存 50 条
      ttl: 1000 * 60 * 30,  // 30 分钟
    });
  }

  async get(
    conversationId: number,
    level: CompressionLevel,
    messages: Message[]
  ): Promise<CompressionResult | null> {
    const key = this.buildKey(conversationId, level, messages);

    // L1: Memory Cache
    const memoryHit = this.memoryCache.get(key);
    if (memoryHit && !this.isExpired(memoryHit)) {
      await this.updateAccessStats(memoryHit);
      return memoryHit.result;
    }

    // L2: IndexedDB
    const dbHit = await this.getFromDB(key);
    if (dbHit && !this.isExpired(dbHit)) {
      // 回填到 Memory Cache
      this.memoryCache.set(key, dbHit);
      await this.updateAccessStats(dbHit);
      return dbHit.result;
    }

    // L3: LocalStorage (降级)
    const lsHit = this.getFromLocalStorage(key);
    if (lsHit && !this.isExpired(lsHit)) {
      // 回填到上层缓存
      this.memoryCache.set(key, lsHit);
      await this.setToDB(lsHit);
      await this.updateAccessStats(lsHit);
      return lsHit.result;
    }

    return null;
  }

  async set(
    conversationId: number,
    level: CompressionLevel,
    messages: Message[],
    result: CompressionResult
  ): Promise<void> {
    const key = this.buildKey(conversationId, level, messages);
    const promptVersion = this.getCurrentPromptVersion(level);
    const sourceHash = this.hashMessages(messages);

    const entry: CompressionCacheEntry = {
      key,
      conversationId,
      level,
      promptVersion,
      sourceHash,
      result,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,  // 7 天
      accessCount: 0,
      lastAccessAt: Date.now(),
    };

    // 写入所有层级
    this.memoryCache.set(key, entry);
    await this.setToDB(entry);
    this.setToLocalStorage(entry);
  }

  private buildKey(
    conversationId: number,
    level: CompressionLevel,
    messages: Message[]
  ): string {
    const promptVersion = this.getCurrentPromptVersion(level);
    const sourceHash = this.hashMessages(messages);
    return `compression:${conversationId}:${level}:${promptVersion}:${sourceHash}`;
  }

  private hashMessages(messages: Message[]): string {
    // 简单哈希：消息 ID + 内容长度
    const signature = messages
      .map(m => `${m.id}:${m.content_text.length}`)
      .join("|");
    return this.simpleHash(signature);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private getCurrentPromptVersion(level: CompressionLevel): string {
    // 从 Prompt 系统获取当前版本
    if (level === "hierarchical") {
      return CURRENT_COMPACTION_PROMPT.version;
    }
    return "v1.0.0";
  }

  private isExpired(entry: CompressionCacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private async getFromDB(key: string): Promise<CompressionCacheEntry | null> {
    // 使用新的 compression_cache 表
    const record = await this.db.table("compression_cache")
      .where("key")
      .equals(key)
      .first();
    return record || null;
  }

  private async setToDB(entry: CompressionCacheEntry): Promise<void> {
    await this.db.table("compression_cache").put(entry);
  }

  private getFromLocalStorage(key: string): CompressionCacheEntry | null {
    try {
      const json = localStorage.getItem(key);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  private setToLocalStorage(entry: CompressionCacheEntry): void {
    try {
      // LocalStorage 有大小限制，只存储小结果
      if (JSON.stringify(entry).length < 50000) {
        localStorage.setItem(entry.key, JSON.stringify(entry));
      }
    } catch {
      // 忽略 LocalStorage 错误
    }
  }

  private async updateAccessStats(entry: CompressionCacheEntry): Promise<void> {
    entry.accessCount++;
    entry.lastAccessAt = Date.now();
    await this.setToDB(entry);
  }

  async cleanup(): Promise<void> {
    // 清理过期缓存
    const now = Date.now();
    const expired = await this.db.table("compression_cache")
      .where("expiresAt")
      .below(now)
      .toArray();

    await this.db.table("compression_cache")
      .bulkDelete(expired.map(e => e.key));

    // 清理 LocalStorage
    for (const entry of expired) {
      localStorage.removeItem(entry.key);
    }
  }
}
```

---

## 第二部分：实施策略

### 3. 安全演进计划

#### 3.1 核心原则

1. **零破坏性** - 不修改任何现有代码
2. **完全隔离** - 新系统独立目录和接口
3. **渐进切换** - Feature Flag 控制，可秒级回滚
4. **向后兼容** - 保持所有现有接口签名

#### 3.2 目录结构

```
frontend/src/lib/
├── compression/                    # 新增：压缩系统
│   ├── index.ts                   # 统一导出
│   ├── smartRouter.ts             # 智能路由
│   ├── semanticChunker.ts         # 语义分块
│   ├── hierarchicalSummarizer.ts  # 分层摘要
│   ├── kgExtractor.ts             # 知识图谱
│   ├── qualityGate.ts             # 质量评估
│   ├── compressionCache.ts        # 缓存系统
│   ├── types.ts                   # 类型定义
│   └── utils.ts                   # 工具函数
│
├── prompts/
│   ├── compaction.ts              # 现有：不动
│   └── smartCompression/          # 新增：新 Prompt
│       ├── semantic.ts
│       ├── hierarchical.ts
│       └── knowledge.ts
│
├── services/
│   ├── insightGenerationService.ts  # 现有：添加 Feature Flag
│   └── compressionService.ts        # 新增：统一入口
│
└── db/
    └── schema.ts                   # 添加 compression_cache 表
```

#### 3.3 演进阶段

**Phase 0: 准备阶段 (Day 1-2)**

```typescript
// 1. 添加 Feature Flag
interface FeatureFlags {
  useSmartCompression: boolean;
  compressionLevel: "semantic" | "hierarchical" | "knowledge" | "auto";
  enableCompressionCache: boolean;
  enableQualityGate: boolean;
}

// 2. 添加数据库表
db.version(12).stores({
  ...existingStores,
  compression_cache: "key, conversationId, level, createdAt, expiresAt",
});

// 3. 添加类型定义
// lib/compression/types.ts
export type CompressionLevel = "semantic" | "hierarchical" | "knowledge";
export interface CompressionResult { ... }
```

**Phase 1: 核心模块实现 (Week 1)**

- 实现 `SemanticChunker` (Tier 1)
- 实现 `CompressionCache` (三级缓存)
- 实现 `SmartRouter` (智能路由)
- 单元测试覆盖率 > 80%

**Phase 2: Sidepanel 集成 (Week 2)**

```typescript
// sidepanel/utils/exportConversations.ts

async function exportConversations(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const featureFlags = await getFeatureFlags();

  if (featureFlags.useSmartCompression && config.contentMode === "compact") {
    // 使用新系统
    return exportWithSmartCompression(conversations, config);
  } else {
    // 使用旧系统
    return exportWithLegacyCompression(conversations, config);
  }
}

async function exportWithSmartCompression(
  conversations: Conversation[],
  config: ExportConfig
): Promise<ExportResult> {
  const compressionService = new CompressionService();

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const messages = await getMessages(conv.id);

      const result = await compressionService.compress(messages, {
        scenario: "export_notion",  // 根据导出目标选择
        targetLevel: "hierarchical",
        useCache: true,
      });

      return {
        conversationId: conv.id,
        title: conv.title,
        content: result.content,
        metadata: result.metadata,
      };
    })
  );

  return formatExportResult(results, config.format);
}
```

**Phase 3: 质量与监控 (Week 3)**

- 实现 `QualityGate` (四维评估)
- 实现 `HierarchicalSummarizer` (Tier 2)
- 添加 Telemetry 埋点
- A/B 测试框架

**Phase 4: 核心功能迁移 (Week 4-6)**

```typescript
// lib/services/insightGenerationService.ts

async function generateConversationSummary(
  conversationId: number,
  settings: LlmConfig,
  hooks?: InsightHooks
): Promise<SummaryRecord> {
  const featureFlags = await getFeatureFlags();

  if (featureFlags.useSmartCompression) {
    // 新系统
    return generateSummaryWithSmartCompression(conversationId, settings, hooks);
  } else {
    // 旧系统 (保持不变)
    return generateSummaryLegacy(conversationId, settings, hooks);
  }
}

async function generateSummaryWithSmartCompression(
  conversationId: number,
  settings: LlmConfig,
  hooks?: InsightHooks
): Promise<SummaryRecord> {
  const messages = await getMessages(conversationId);
  const compressionService = new CompressionService();

  // 使用智能路由选择最优策略
  const result = await compressionService.compress(messages, {
    scenario: "summary_thread",
    targetLevel: "auto",  // 自动选择
    useCache: true,
    qualityThreshold: 0.85,
  });

  // 转换为现有格式
  return {
    conversationId,
    content: result.content,
    structured: result.structured,
    format: "structured_v2",
    status: result.qualityMetrics.passed ? "ok" : "fallback",
    modelId: settings.modelId,
    createdAt: Date.now(),
    sourceUpdatedAt: messages[messages.length - 1]?.created_at || Date.now(),
  };
}
```

**Phase 5: 知识图谱与完善 (Week 7-8)**

- 实现 `KnowledgeGraphExtractor` (Tier 3)
- Network 节点摘要集成
- 存储自动压缩
- 性能优化与文档

