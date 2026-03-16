# PACS 系统删除总结

> 本文档记录 PACS (Production Adaptive Compression System) 的删除过程和保留的 Kimi 压缩机制。

---

## 删除原因

1. **架构过度设计** - Map-Reduce 分层压缩过于复杂
2. **效果不理想** - 分块破坏了对话上下文，输出质量不稳定
3. **成本高** - 多次 API 调用，延迟大
4. **Kimi 替代效果更好** - 长上下文一次性处理，输出格式优化

---

## 删除的文件

### 1. 核心目录（已删除）
```
frontend/src/lib/compression/           ← 整个目录
├── types.ts
├── semanticChunker.ts
├── hierarchicalSummarizer.ts
├── compressionService.ts
├── compressionCache.ts
├── smartRouter.ts
├── qualityGate.ts
├── textCleaner.ts
├── insightAdapter.ts
├── knowledgeGraphExtractor.ts
├── networkIntegration.ts
├── utils.ts
├── index.ts
└── README.md
```

### 2. 设置服务（已删除）
```
frontend/src/lib/services/compressionSettingsService.ts
```

### 3. UI 组件（已删除）
```
frontend/src/sidepanel/components/CompressionSettingsPanel.tsx
```

---

## 修改的文件

### 1. insightGenerationService.ts
**修改内容**:
- 移除 `import { runCompactionWithPacs, ... } from "../compression/insightAdapter"`
- 修改 `runCompaction` 函数，删除 PACS 调用部分，只保留传统 compaction prompt 逻辑

**结果**: Insight 生成现在直接使用传统方式，不再尝试 PACS 压缩

### 2. exportConversations.ts
**修改内容**:
- 删除 `compressionService` 变量和 `getCompressionService` 函数
- 删除 `isSmartCompressionEnabled` 函数
- 删除 `exportWithSmartCompression` 函数
- 简化 `exportConversations` 直接调用 `exportWithLegacyFormat`

**结果**: 导出功能回归简单实现，支持 Full/Compact/Summary 三种模式的简单截断

### 3. schema.ts
**修改内容**:
- 删除 `import type { CompressionCacheEntry } from "../compression/types"`
- 注释掉 `CompressionCacheRecord` 接口
- 注释掉 `compression_cache` 表定义
- 注释掉 `compression_cache` stores 定义

**结果**: 数据库不再创建 compression_cache 表

---

## 保留的压缩机制

### Kimi 专用压缩（推荐）

```
frontend/src/lib/services/kimiService.ts           ← 保留
frontend/src/sidepanel/utils/exportConversationsV2.ts  ← 保留（使用 Kimi）
frontend/src/lib/config/apiKeys.ts                 ← 保留（Kimi API Key 管理）
```

**使用场景**:
- 导出功能的 Compact 模式
- 导出功能的 Summary 模式
- 需要高质量压缩时使用

**优点**:
- 200K 长上下文，不破坏对话完整性
- 专用 Prompt，输出格式优化
- 单次 API 调用，简单可靠

---

## 当前压缩机制对比

| 场景 | 原方案 (PACS) | 当前方案 |
|------|--------------|---------|
| **Insight 生成** | PACS Map-Reduce 压缩 | 传统 compaction prompt |
| **周报生成** | PACS Batch 压缩 | 直接生成 |
| **导出 Full** | 完整导出 | 完整导出（无变化） |
| **导出 Compact** | PACS 压缩 | Kimi compressCompact |
| **导出 Summary** | PACS 压缩 | Kimi compressSummary |

---

## 后续建议

### 短期
- 观察 Kimi 压缩在导出场景的表现
- 收集用户反馈

### 中期
- 如果 Kimi 效果好，考虑将 Insight 生成也迁移到 Kimi
- 统一压缩机制，简化架构

### 长期
- 如果不再需要，可彻底删除 `exportConversations.ts` 中的简单截断逻辑
- 完全切换到 Kimi 方案

---

## 合并注意事项

向同事合并代码时需要说明：

1. **PACS 已删除** - 不要寻找 compression 目录
2. **导出功能简化** - 传统导出使用简单截断，AI 压缩使用 Kimi
3. **数据库表** - compression_cache 表不再创建（已有数据不影响）
4. **设置面板** - CompressionSettingsPanel 已删除，不要引用

---

*删除日期: 2026-03-16*  
*删除者: PACS 原作者*  
*原因: 架构过度设计，效果不如 Kimi 简单方案*
