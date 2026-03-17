# Capture Engine Engineering Spec

Status: Active canonical engineering spec  
Audience: Parser maintainers, runtime engineers, reader/export/compression contributors

## 1. Product Goal

Capture engine 的服务对象不是单纯 transcript parser，而是一个可回看、可检索、可导出、可压缩上下文的对话归档系统。

它的核心职责不是“尽可能提取文字”，而是“尽可能保留一段对话未来仍有价值的信息结构”，以便：
- 用户在阅读中台快速翻阅过往对话
- reader 尽可能保真地重建消息结构
- JSON / MD / TXT 导出共享同一份规范化输入
- 上下文压缩和后续搜索能继承结构化信号，而不是只消费纯文本

## 2. Non-Negotiable Principles

### 2.1 Preservation First

以下信息至少要保留存在性，不能静默丢失：
- uploaded image
- generated image
- artifact / preview / downloadable output
- citation / link target
- task state
- message meta

即使当前阶段无法完整抓取二进制内容，也必须有结构化占位或元数据摘要。

### 2.2 One Normalized Input Contract

reader、JSON / MD / TXT 导出、上下文压缩、后续搜索不应各自从 `content_text` 硬挖，而应共享同一份规范化输入。

### 2.3 Layered Parsing Direction

`raw site DOM -> normalized semantic DOM -> shared extraction` 是唯一推荐方向。

平台差异应优先在 platform-local normalization 中被吸收，而不是继续把站点私有 DOM 猜测堆进 shared extractor。

### 2.4 No Silent Loss

多模态与结构化信息允许降级，不允许静默消失。

允许的降级形式：
- attachment / artifact 元数据占位
- citation 文字加链接目标
- image 的缩略图、alt、来源、数量、所在消息位置

不允许的结果：
- reader 没有任何存在痕迹
- 导出完全丢失该信息
- compression / search 输入里完全没有该信息

## 3. Stable Baseline That Remains In Force

以下既有治理语义继续有效，本规格不重写它们：
- `mirror / smart / manual` capture governance
- transient capture store
- `force archive`
- `missing conversation id`
- 既有 capture decision 与 sidepanel 交互语义

本轮规范收口不重新设计以下内容：
- 存储去重策略
- runtime event 语义
- IndexedDB schema 的既有行为
- 已上线平台 host scope 与平台命名

## 4. Target Content Package Contract

长期目标不是只产出 `textContent`，而是产出一个内容包。

| 字段 | 角色 | 说明 |
| --- | --- | --- |
| `plain_text` | 最小可搜索文本 | 用于检索、简单 fallback、纯文本导出 |
| `semantic_ast` | 主渲染结构 | reader、结构化导出、压缩的首选输入 |
| `normalized_html_snapshot` | 可回放兜底 | 用于 reparsing、调试、未来修复和保真导出 |
| `attachments[]` | 附件存在性 | 上传文件、图片、文件卡、下载物、引用附件等 |
| `artifacts[]` | 产物存在性 | 代码 artifact、画布、预览卡、图表、工具输出等 |
| `citations[]` | 引用存在性 | label、href、来源类型、出现位置 |
| `message_meta` | 消息元数据 | model slug、tool / thinking 状态、生成状态、任务状态等 |

说明：
- `attachments[] / artifacts[] / citations[] / message_meta` 是目标规范，即使实现尚未齐备，也必须作为未来 contract 保留。
- `normalized_html_snapshot` 是平台归一化后的快照，不是原始站点 DOM 的无限制镜像。

## 5. Target Layered Architecture

### 5.1 Discovery

职责：
- 找到 conversation root、turn root、candidate root
- 找到稳定的 session / conversation identity 来源
- 判断页面是否处于可捕获状态

### 5.2 Boundary / Role Inference

职责：
- 确定一条消息的最小边界
- 识别 `user / assistant / system-like` 角色
- 把 action bar、retry、toolbar、header、pagination 等噪声排除在正文边界之外

### 5.3 Platform Normalization

职责：
- 将 vendor-specific DOM 清洗成 normalized semantic DOM
- 处理复杂 editor、code viewer、math、rich card、citation pill、task list、artifact shell
- 为 shared extraction 提供更稳定的输入

这是下一轮重构的第一优先层，必须从 parser 内部被正式抽出。

### 5.4 Shared Semantic Extraction

职责：
- 从 normalized semantic DOM 产出 `plain_text`、`semantic_ast` 与结构化信号
- 对 table、math、code、blockquote、list、attachment placeholder 等通用语义做统一抽取

shared AST 不应继续承担平台私有 DOM 猜测。

### 5.5 Persistence / Indexing

职责：
- 持久化内容包中的当前已落地部分
- 为未来的 `normalized_html_snapshot`、attachment / artifact / citation 元数据扩展预留规范位置
- 保证 dedupe、governance 与 transient integration 可以继续复用

### 5.6 Reader / Export / Compression Consumers

职责：
- reader 尽可能保真渲染结构化内容
- JSON / MD / TXT 导出共享同源结构
- compression 利用结构化信息保留上下文密度
- search 至少能利用 `plain_text` 与关键存在性元数据

## 6. Multi-Platform Rules

- 允许 platform-local normalization。
- shared AST 只消费 normalized semantic DOM。
- 不再鼓励把站点私有 DOM 猜测写进 shared extractor。
- 不允许因为某个平台难抓就降低全局 contract。
- 允许分阶段落地，但每个平台都应朝同一 contract 收敛。

## 7. What This Spec Explicitly Does Not Do

本规格不要求本轮立即完成：
- 图片或 artifact 二进制落库
- 全平台一次性切换到新 parser 分层
- reader / export / compression / search 在同一版本中全部升级

但本规格要求后续所有实现都朝同一个目标 contract 收敛，而不是继续扩散 `textContent + ad hoc fallback`。

## 8. Recommended First Implementation Slice

下一轮工程实现建议按以下顺序推进：
1. 先把 ChatGPT / Qwen 的 `platform normalization` 抽成正式 stage。
2. 让 shared extraction 只吃 normalized semantic DOM。
3. 为内容包扩出 `normalized_html_snapshot` 与结构化存在性元数据的规范位置。
4. 再逐步对接 reader / export / compression / search。

## 9. Historical Source

本规格整合自以下历史文档与本轮只读诊断：
- `v1_2_capture_governance_spec.md`
- `v1_3_platform_expansion_spec.md`
- `v1_4_capture_engine_hardening_retrospective.md`
- `v1_5_capture_engine_refactor_roadmap.md`

上述文件已归档保留，但不再维护为活文档。
