# Reader Pipeline Current Architecture

Status: Active as-is architecture and gap analysis  
Audience: Reader/export/compression owners, schema maintainers, web contributors

## 1. Purpose

本文档描述 reader pipeline 当前真实代码链路、已经成型的边界、仍然明显漂移的部分，
以及从当前状态迁移到目标 contract 的推荐顺序。
这是一份只读诊断，不是实现变更日志。

## 2. Current End-to-End Flow

当前主链路可以概括为：

1. capture 落库
   - parser 和 capture middleware 将 `Conversation` / `Message` 写入 IndexedDB
2. repository / storage service
   - repository 负责 DB record 到 typed `Conversation` / `Message` 的转换
   - sidepanel 和 web 通过 storage bridge 消费这些 typed records
3. reader
   - 优先消费 AST，必要时回退到纯文本
4. export
   - JSON 可携带 AST 与更多 metadata
   - MD / TXT 过去更偏 `content_text`
5. compression / summary / weekly insight
   - 过去更偏 text-centric prompt input
6. web consumer
   - `vesti-web` 通过 storage bridge 读取 conversation，但类型和时间逻辑长期存在漂移

## 3. Boundaries That Are Already Reasonable

### 3.1 Repository and Consumer Split Exists

DB 层、repository 层、consumer 层至少有明确分层，这使得时间 helper 和统一 contract
有可插入位置。

### 3.2 Reader / Export / Insight Surfaces Are Already Distinct

reader、export、summary / weekly insight 现在都有相对独立的入口。
这意味着统一 contract 可以逐层接入，而不是只能一次性推翻重来。

### 3.3 Web Surface Already Reuses the Same Storage Bridge

`vesti-web` 不是完全独立的数据世界。这为跨端统一时间语义提供了现实基础。

## 4. Main Gaps

### 4.1 Timestamp Semantics Were Overloaded

过去 `source_created_at / created_at / updated_at` 在不同地方承担了不同意义：

- 有的地方把 `source_created_at ?? updated_at` 当线程时间
- 有的地方把 `created_at` 当 chronology
- 有的地方把 `updated_at` 同时当“最近捕获”和“最近修改”

这是 reader pipeline 当前最需要先收口的问题之一。

### 4.2 Consumer Logic Drifted Across Surfaces

sidepanel、timeline、insights、export、compression、web library 过去没有统一 helper。
结果是相同 conversation 在不同页面会显示成不同的“开始时间”或“更新时间”。

### 4.3 Reader Package Is Still Incomplete

reader 对文本、代码、列表、公式、表格等结构已经有一定支持，
但 attachment、image、artifact、citation 等更完整的 conversation package
仍未成为各 consumer 的一等结构。

就数学公式而言，当前状态需要进一步拆开看：

- 扩展侧 reader 已具备 `AstMathNode -> KaTeX` 的基础渲染能力，并开始以 `AstMathNode.tex` 作为节点级复制的统一来源
- 真正脆弱的环节仍是 capture 侧的跨平台公式源提取、TeX normalization 以及 `content_text` canonicalization
- 当前 reader 的关键收口点不是“继续增强 KaTeX”，而是让 math AST 不再被脏 `content_text` 反向否决
- `vesti-web` 当前仅补齐 message / AST contract，对未来数学公式 reader 与复制语义做类型预留；它还不是一个真实消费 AST math 的 reader
5a34526 (feat(time): baseline timestamp semantics and reader/web alignment)
## 9. Decision Statement

reader pipeline 当前不是“没有架构”，而是“主通道已经存在，但共享 consumer contract 还不够强”。
现在最需要解决的不是单个页面显示错时间，而是同一条线程在多条消费链路里是否共享同一套结构和时间语义。
