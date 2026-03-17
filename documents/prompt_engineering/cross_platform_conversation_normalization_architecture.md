# Cross-Platform Conversation Normalization Architecture

Status: Active supporting architecture note  
Audience: Runtime engineers, capture engineers, prompt engineers, domain experts

## Purpose

这份文档解释 export pipeline 在 `E0 dataset_builder` 之前依赖的上游层：**cross-platform normalization and semantic annotation**。

它回答一个经常被 export 文档默认带过的问题：

- 为什么 `E0` 在 Vesti 内部看起来是 deterministic 的，
- 但在跨平台 capture / ingestion 场景里，`E0` 之前还必须有一层更早的归一化与标注。

这份文档不替代 export multi-agent 文档；它负责说明 export 之前的数据准备边界。

## Why pre-E0 matters

如果输入已经是 Vesti 内部统一 schema 的线程，`E0 dataset_builder` 确实可以被视为 deterministic local stage。

但在跨平台场景里，输入可能来自：
- Claude.ai
- ChatGPT
- Cursor
- Slack
- 其他聊天或协作工具

这些来源在以下方面都不一致：
- message role markers
- tool-call 表达方式
- metadata 字段命名
- multi-turn threading 结构
- code block / artifact 附着方式
- edited / regenerated turns 的表示方法

因此，export pipeline 需要的“稳定输入面”并不是天然存在的，而是上游预处理出来的。

## Architecture boundary

跨平台 conversation ingestion 应被理解成以下边界：

1. `P0 platform_normalizer`
2. `P1 semantic_annotator`
3. `E0 dataset_builder`
4. downstream export stages (`E1/E2/E3/...`)

### `P0 platform_normalizer`

职责：
- 把不同平台的 conversation dump 归一成统一内部表示
- 尽量保持 deterministic mapping
- 显式记录来源平台与映射损失

典型任务：
- role normalization
- timestamp field normalization
- thread / message identity normalization
- tool-call envelope normalization
- attachment / artifact metadata normalization
- regenerated / edited turn flattening or linking

`P0` 的目标不是理解对话含义，而是把结构先统一。

### `P1 semantic_annotator`

职责：
- 对统一结构后的对话补充 heuristic / semantic labels
- 提前标记后续 export 会依赖的状态信号

典型标注目标：
- correction turn
- tentative decision
- confirmed decision
- unresolved cue
- artifact-bearing message
- reusable snippet cue
- question pivot / topic shift

`P1` 不是一个开放式 agent loop，也不应该承担最终 summary/composer 的职责。
它的角色是：
- 为 `E0` 之后的 bounded export chain 提供更高质量的输入面

## Why this is not “just part of E0”

把这些工作全部塞进 `E0` 会带来三个问题：

1. `E0` 的 deterministic 边界会被破坏
2. export 文档会假装输入天然干净，掩盖真正的 ingestion 风险
3. downstream prompt tuning 会替上游 schema 问题背锅

因此这里明确区分：
- `P0/P1` 负责让 conversation 变成“可进入 export 的内部对象”
- `E0` 负责从这些内部对象装配出 export dataset

## Relationship to AI Handoff and Knowledge Export

`AI Handoff` 和 `Knowledge Export` 虽然目标不同，但都依赖同一套 pre-`E0` 数据质量基础。

- AI Handoff 更依赖：
  - decision markers
  - unresolved cues
  - artifact-bearing messages
  - correction traces
- Knowledge Export 更依赖：
  - core-question cues
  - reusable snippet cues
  - topic pivots
  - actionability cues

这意味着：
- `P0/P1` 不等于偏向某一条 export mode
- 但 `P1 semantic_annotator` 需要足够丰富，才能同时服务 handoff 和 knowledge 两类 downstream stage

## Current state vs target state

### Current state
- Vesti 内部线程场景下，`E0` 可以近似视为 deterministic local stage
- 跨平台 normalization / annotation 还没有被单独收成一条 canonical 说明
- 因此 export 文档此前默认了一个比真实系统更干净的输入前提

### Target state
- `P0/P1` 作为独立架构边界被明确记录
- 不同平台输入的损失、猜测与标注策略可被单独评估
- export prompt tuning 不再替 ingestion normalization 缺口背锅

## Deliberate non-goals

这份文档明确 **不负责**：
- 规定具体的 UI capture flow
- 定义每个平台的完整 adapter 细节
- 把 `P1` 演变成另一个开放式 AI pipeline
- 替代 export composer / validator 文档

## Relationship to other docs

如果你想理解：
- AI handoff 为什么需要保真任务状态，先看：
  - `export_ai_handoff_architecture.md`
- Knowledge export 为什么需要结构化回看资产，先看：
  - `export_knowledge_export_architecture.md`
- export 后段的 bounded chain 如何组织，继续看：
  - `export_multi_agent_architecture.md`
  - `export_prompt_contract.md`
  - `export_prompt_inventory.md`

## Working conclusion

对于跨平台 conversation ingestion 而言，真正的系统边界不是从 `E0 dataset_builder` 开始，而是从：
- `P0 platform_normalizer`
- `P1 semantic_annotator`

开始。

只有先把输入统一和标注好，`E0` 才能继续保持 deterministic，后续 `AI Handoff` 和 `Knowledge Export` 的 bounded chain 才有稳定输入面可用。