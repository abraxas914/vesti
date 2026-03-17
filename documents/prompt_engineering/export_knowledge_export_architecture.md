# Export Knowledge Export (summary) Architecture

Status: Expert-facing bridge doc  
Audience: Prompt engineers, runtime engineers, domain experts, release owners

## Purpose

这是一份给专家沟通用的单文档入口，用来解释 Vesti 里 **Knowledge Export (summary)** 的当前状态和未来方向。

它把目前分散在多份文档里的三层信息收在一起：

- 当前已经 shipped 的运行路径
- 当前 prompt/runtime contract
- 未来 export multi-agent 的演进方向

如果需要只看一份文档来理解 Vesti 现在怎么做知识卡片式导出，以及后面准备往哪里走，优先看这一份。

## Why Knowledge Export

Knowledge Export 不是 AI Handoff 的弱化版，也不是普通“摘要”。

它服务的是另一类目标：

- 让人类在未来回看时能快速恢复上下文
- 把一次技术对话沉淀成可复用的知识资产
- 让输出更适合进入 Notion / Obsidian / 内部知识库
- 把“问题定义、关键推进、可复用片段、后续动作”组织成稳定结构

Knowledge Export 的目标不是简单缩短对话，而是把一次执行性很强的对话转化为一个 **可回看、可检索、可沉淀** 的 knowledge artifact。

它和 AI Handoff 的区别在于：

- AI Handoff 更强调下一位 agent / engineer 继续执行
- Knowledge Export 更强调未来人类或系统重新理解和复用

## Current shipped path

当前 shipped 的 Knowledge Export 路径，同样还不是完整的 multi-agent runtime，而是 bridge state。

### 已经落地的部分

现在真实运行的是：

1. `E0 dataset_builder`
   - deterministic local stage
   - 收集 selected threads、ordered messages、metadata、export mode

2. `E3 summary composer`
   - prompt-driven export composition
   - 通过当前 model/profile 路由执行
   - 外围有 validator、diagnostics 和 deterministic local fallback

### 还没有 runtime 化的部分

这些阶段目前还没有作为独立 runtime stage 落地：

- `E1 structure_planner`
- `E2 evidence_compactor`
- `repair` 的独立 artifact 分层

因此，当前 shipped Knowledge Export 路径依然是：

- `E0 dataset_builder`
- 直接进入当前的 summary composer
- 在输出后做 validation / diagnostics / fallback

## Current runtime contract

### Runtime source of truth

当前 runtime prompt source 仍然是：

- `frontend/src/lib/prompts/**`

`documents/prompt_engineering/**` 负责解释 contract、architecture、inventory 和 governance，但不是 runtime prompt text authority。

### Shipping headings

当前 shipping 的 **Knowledge Export (summary)** 仍然要求这些 exact headings：

- `## TL;DR`
- `## Problem Frame`
- `## Important Moves`
- `## Reusable Snippets`
- `## Next Steps`
- `## Tags`

这些 headings 同样属于 live validator contract 的一部分。

### Current model/profile routing

当前 export 路径已经是 model-profile aware 的。

当前 active export profiles 是：

- `kimi_handoff_rich`
- `step_flash_concise`

虽然 profile 命名仍然更偏 handoff 语义，但目前 summary 也复用这套 profile 路由。

### Current diagnostics and fallback

当前 shipped path 已经有：

- structured validation
- invalid-reason codes
- visible diagnostics in export feedback
- deterministic local fallback

因此，Knowledge Export 当前的问题也不再是“能不能调用模型”，而是“模型能不能稳定地产出符合 summary contract 的知识化输出”。

## Current pain points

当前 Knowledge Export 的主矛盾，同样是 prompt-engineering stability，而不是 infra。

主要痛点包括：

- exact heading compliance 仍然需要更稳
- `summary` 的结构化程度和“知识卡片感”还不够强
- artifact 保留和 note readability 之间的平衡还不够理想
- 当前 profile 名称和输出目标之间还不够语义对齐

更具体地说，Knowledge Export 当前还处在：

- runtime 已经能跑
- summary contract 已经存在
- 但“知识资产化”表达仍然偏弱

## Target architecture

未来 Knowledge Export 应该和 AI Handoff 共用前段 bounded chain，只在最终 composer 分叉。

目标路径是：

1. `E0 dataset_builder`
2. `E1 structure_planner`
3. `E2 evidence_compactor`
4. `E3 summary composer`
5. optional `repair`

### `E0 dataset_builder`

- deterministic local stage
- 标准化 selected threads、messages、metadata、mode
- 为后续所有 stage 提供稳定输入面

### `E1 structure_planner`

- 判断这次 summary 更接近哪一类知识沉淀
- 识别：
  - core question
  - progression density
  - artifact density
  - actionability density
  - likely knowledge value
- 输出 planning notes，而不是最终笔记

### `E2 evidence_compactor`

- 提炼知识资产需要的核心证据
- 提取：
  - core question
  - important moves
  - grounded snippets
  - actionable next steps
  - useful tags and reference anchors
- 输出 evidence skeleton

### `E3 summary composer`

- 把 evidence skeleton 组装成 shipping summary markdown
- 强调 human recall、knowledge reuse、note readability
- 保持 profile-aware

### `repair`

- 只在 structured-output failure 之后触发
- 用于修补 summary contract 不合规的输出
- 不能演变成开放式 retry loop

## Borrowed patterns

### Borrowed from legacy Insights

- `conversation_summary` 风格的结构化思维
- 对核心问题、推进过程、后续动作的显式组织
- “未来回看可读”优先于纯压缩率

### Borrowed from Explore

- bounded chain semantics
- intermediate artifact thinking
- 后续可观察的 trace / stage view 潜力

### Borrowed from external summary / compaction thinking

Knowledge Export 也应吸收：

- threshold-triggered summarization
- state distillation over transcript shrinking
- 让下一次阅读继承真实结构，而不是只继承词句

## Deliberate non-goals

Knowledge Export 的方向明确 **不包括**：

- 直接把 summary 改成中文专用 schema 作为默认 shipping contract
- 把 summary 退化成松散摘抄
- 把 summary 做成比 compact 更空泛的“感想笔记”
- 继承 Explore 全套 session / tool taxonomy
- 把 export 变成泛化的知识管理平台壳子

Knowledge Export 应保持：

- bounded
- export-centric
- contract-driven
- note-oriented
- artifact-aware

## Relationship to AI Handoff

AI Handoff 和 Knowledge Export 共享同一条 export 主线，但承担不同角色：

- `AI Handoff (compact)`
  - 面向执行接续
  - 优先保证 task-state transfer fidelity
- `Knowledge Export (summary)`
  - 面向未来回看与知识沉淀
  - 优先保证结构化 recall 和 reusable note quality

未来它们应共享：

- `E0 dataset_builder`
- `E1 structure_planner`
- `E2 evidence_compactor`

并只在最终 composer 分叉。

## Relationship to other docs

这份文档是 **summary / knowledge-export 方向的 first-read** 入口。

看完这一份之后，再按需要进入细分 canonical docs：

- `export_multi_agent_architecture.md`
  - 未来 bounded-chain architecture
- `export_prompt_contract.md`
  - prompt ownership 与 stage contract
- `export_prompt_inventory.md`
  - shipped vs target runtime inventory
- `export_compression_current_architecture.md`
  - 当前 shipped implementation snapshot

如果要先理解 compact / AI 接续方向，则优先看：

- `export_ai_handoff_architecture.md`

## Immediate follow-up tracks

### Follow-up A: Export panel wording and light visual absorption

这是一条 presentation-only follow-up。

允许做的事：

- front-end labels 调整为：
  - `Full`
  - `AI Handoff`
  - `Knowledge Export`
- 吸收更强的 mode-card 与 format-button 表达

不允许做的事：

- 改 export serialization contract
- 回退 `Download / Copy`
- 破坏 diagnostics / fallback notice flow

### Follow-up B: Prompt design absorption without schema change

这是一条 prompt-engineering follow-up。

允许吸收的方向：

- 更明确的 exemplar-based output anchoring
- 更强的 knowledge-card framing
- 更清晰的 actionable next steps 约束
- 更强的 reusable snippet completeness 要求

不允许做的事：

- 替换当前 shipping headings
- 为中文专用 schema 开双轨 validator
- 借 prompt 调优之名重写 public summary export contract

## Working conclusion

Vesti 已经有一条真实可运行的 Knowledge Export 路径，但它目前仍然处在 bridge state：

- runtime path 已经存在
- contract 已经存在
- diagnostics 已经存在
- summary 的知识化表达还不够强
- multi-agent decomposition 还没有真正拆开

Knowledge Export 的下一步，不应该只是让 summary 更长或更花哨，而应该是：

- 继续提高它对 future recall 和 knowledge reuse 的支持能力
- 再在不破坏 shipping summary contract 的前提下，把 planner / compactor / composer 逐步拆成 bounded chain
