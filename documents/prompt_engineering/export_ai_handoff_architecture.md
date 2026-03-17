# Export AI Handoff (compact) Architecture

Status: Expert-facing bridge doc  
Audience: Prompt engineers, runtime engineers, domain experts, release owners

## Purpose

这是给专家沟通使用的单文档入口，用来解释 Vesti 里 **AI Handoff (compact)** 的当前状态、真实约束和未来演进方向。

它把目前分散在多份文档里的三层信息收在一起：

- 当前已经 shipped 的运行路径
- 当前 prompt/runtime contract
- 未来 export multi-agent 的目标架构

如果只看一份文档来理解 Vesti 现在如何做 AI handoff，以及为什么后续要走 bounded multi-agent 路线，优先看这一份。

## Why AI Handoff

长程 agent 遇到的问题，通常不是模型突然不够强，而是上下文逐步失真。

常见失真方式包括：
- 旧工具结果还在上下文里，但已经失去权重
- 中间状态被反复转述后，决策依据逐渐模糊
- 摘要保留了表层话语，却丢掉了真正的任务状态
- 下一个 context window 继承了文本，却没有继承可继续执行的状态

所以 AI handoff 的目标不是“把聊天记录变短”。

AI handoff 的目标是：
- 折叠旧工具结果，把稳定状态保留下来
- 在 context budget 接近阈值时触发压缩，而不是任意缩短文本
- 保留 grounded decisions、artifacts、constraints、unresolved work
- 把下一个窗口真正需要继续执行的任务状态提纯出来

这里的核心不是 transcript shortening，而是 **task-state distillation**。

## Current shipped path

当前 shipped 的 AI Handoff 路径，还不是完整的 multi-agent runtime，而是一个 bridge state。

### 已经落地的部分

现在真实运行的是：

1. `E0 dataset_builder`
   - deterministic local stage
   - 收集 selected threads、ordered messages、metadata、export mode

2. `E3 compact composer`
   - prompt-driven export composition
   - 通过当前 model/profile 路由执行
   - 外围已有 validator、diagnostics 和 deterministic local fallback

### 还没有 runtime 化的部分

这些阶段目前还没有作为独立 runtime stage 落地：
- `E1 structure_planner`
- `E2 evidence_compactor`
- `repair` 的独立 artifact 分层

因此，当前 shipped path 更准确的描述是：

- `E0 dataset_builder`
- 直接进入当前 compact composer
- 在输出后做 validation / diagnostics / fallback

## Current runtime contract

### Runtime source of truth

当前 runtime prompt source 仍然是：

- `frontend/src/lib/prompts/**`

`documents/prompt_engineering/**` 负责解释 contract、architecture、inventory 和 governance，但不是 runtime prompt text authority。

### Shipping headings

当前 shipping 的 **AI Handoff (compact)** 仍然要求这些 exact headings：
- `## Background`
- `## Key Questions`
- `## Decisions And Answers`
- `## Reusable Artifacts`
- `## Unresolved`

这些 headings 不是参考建议，而是 live validator contract 的一部分。

### Current model/profile routing

当前 export 路径已经是 model-profile aware 的。
当前 active export profiles 是：

- `kimi_handoff_rich`
- `step_flash_concise`

这些 profile 目前会影响：
- prompt budget
- prompt strategy
- export composition behavior

### Current diagnostics and fallback

当前 shipped path 已经具备：
- structured validation
- invalid-reason codes
- visible diagnostics in export feedback
- deterministic local fallback

因此当前主问题不再是“能不能调用模型”，而是“模型能不能稳定服从 compact contract”。

## Structural tensions clarified in this revision

这轮修订明确处理三个之前写得过于隐含的结构性张力。

### 1. `E1/E2` 是 shared stage slots，不是 mode-agnostic prompts

文档过去说 `Compact` 和 `Summary` 共享 `E0/E1/E2`，只在 `E3` 分叉。这个表述在架构图上简洁，但容易让人误解为：`E1/E2` 可以由同一套中立 prompt 完成。

这里要明确：
- `E1/E2` 共享的是 **stage slot、输入输出边界、artifact contract**
- `E1/E2` 不共享一套 mode-agnostic instruction
- `E1/E2` 的实现应被理解为 **mode-parameterized shared stages**

对于 AI Handoff：
- `E1` 更关注 task frame、artifact density、decision density、unresolved density
- `E2` 更关注 constraints、decisions、decision rationale、concrete artifacts、unresolved work

因此，“共享 E1/E2”并不意味着后续只写一个 prompt；更准确的说法是：
- shared stage
- mode-parameterized implementation

### 2. 当前 profile 路由仍是 bridge-state，不是最终分层

`kimi_handoff_rich` 和 `step_flash_concise` 目前对 `AI Handoff` 和 `Knowledge Export` 都生效。
这在 shipped bridge state 阶段可接受，但不是最终抽象。

未来更合理的拆法应是双轴：
- model axis：`kimi` / `step`
- task axis：`handoff` / `knowledge`

也就是说，将来真正影响 `E3 compact composer` 的不应只是“模型是谁”，还应包括“任务目标是不是 handoff”。

当前文档明确承认：
- 现有 profile 命名更偏 handoff 语义
- 现有 profile 路由对 Knowledge Export 来说只是过渡方案
- 后续需要把 model strategy 和 task strategy 解耦

### 3. 跨平台场景下，`E0` 之前还需要一层 pre-`E0` normalization

当输入已经是 Vesti 内部统一 schema 的线程时，`E0 dataset_builder` 可以被视为 deterministic local stage。

但在跨平台 capture / ingestion 场景里，输入可能来自：
- Claude.ai
- ChatGPT
- Cursor
- Slack
- 其他聊天或协作工具

这些来源的 role markers、tool-call 表达、metadata 字段、多轮结构都不一致。
其中一部分工作并不只是字段映射，而是 heuristic / semantic annotation。

因此，这轮文档明确引入一个 `pre-E0` 视角：
- `P0 platform_normalizer`
- `P1 semantic_annotator`
- `E0 dataset_builder`

`E0` 依赖前面的归一化与语义标注层，但自身仍保持 deterministic assembly 的角色。

相关说明见：
- `cross_platform_conversation_normalization_architecture.md`

## Current pain points

当前 AI Handoff 的主矛盾是 prompt-engineering stability，不是 infra。

现在已经基本排除掉的方向包括：
- proxy auth 作为主阻塞
- model switch 没生效
- export route 选错

现在真正不稳定的部分是：
- exact heading compliance
- grounded section density
- artifact preservation
- `Kimi-K2.5` 在 compact 输出上的稳定性

因此，下一个阶段最该做的不是再做一轮 infra 排查，而是继续收紧 prompt、validator 反馈和 bounded decomposition。

## Target architecture

未来 AI Handoff 应该演进成一条 bounded chain，但这里的“bounded”要连同 pre-`E0` 边界一起理解：

0. `P0 platform_normalizer`
1. `P1 semantic_annotator`
2. `E0 dataset_builder`
3. `E1 structure_planner`
4. `E2 evidence_compactor`
5. `E3 compact composer`
6. optional `repair`

### `P0 platform_normalizer`

- upstream normalization stage
- 负责把不同平台的线程 / 消息 / role / metadata 归一成统一内部表示
- 仍以 deterministic mapping 为主

### `P1 semantic_annotator`

- heuristic / semantic labeling stage
- 标注后续 handoff 可能需要的重要信号，例如：
  - correction turns
  - tentative decisions
  - artifact markers
  - unresolved cues
- 不是最终 export agent stage，但决定 `E0` 之后的数据质量上限

### `E0 dataset_builder`

- deterministic local stage
- 从已归一、已标注的内部表示中装配 export dataset
- 为后续 stage 提供稳定输入面

### `E1 structure_planner`

- 识别这次 handoff 的重点
- 判断：
  - task frame
  - artifact density
  - decision density
  - unresolved density
  - likely handoff focus
- 输出 planning notes，而不是最终 markdown
- **这是 shared stage slot，但实现必须 mode-parameterized**

### `E2 evidence_compactor`

- 负责提纯任务执行状态
- 提取：
  - constraints
  - decisions
  - decision rationale
  - concrete artifacts
  - unresolved work
- 输出 evidence skeleton，而不是给最终用户看的成品
- **这同样是 shared stage slot，但实现必须 mode-parameterized**

### `E3 compact composer`

- 把 evidence skeleton 组装成 shipping compact markdown
- 保持 profile-aware
- 负责最终的 transfer fidelity 与可读性

### `repair`

- 只在 structured-output failure 之后触发
- 针对 expected contract 做 bounded repair
- 不能演变成开放式 retry tree

## Borrowed patterns

### Borrowed from legacy Insights
- evidence distillation 作为独立阶段
- fallback-aware pipeline thinking
- downstream composition 优先于 one-shot summary

### Borrowed from Explore
- bounded chain semantics
- stage / tool trace 的可观察性
- intermediate artifact mindset

### Borrowed from external compaction thinking
值得保留的外部模式是：
- fold old tool results into stable task state
- threshold-triggered summarization
- model-initiated compaction 作为未来可控方向

但 Vesti 不应该因此把 export 变成开放式 agent loop。

## Deliberate non-goals

AI Handoff 的方向明确 **不包括**：
- 把中文专用 schema 直接变成默认 shipping contract
- 把 compact 做成自由散文式摘要
- 继承 Explore 整套 session model 或 tool taxonomy
- 引入开放式 reflective loop
- 把 export 变成泛用 orchestration shell

AI Handoff 应该保持：
- bounded
- export-centric
- contract-driven
- artifact-preserving

## Relationship to other docs

这份文档是 **first-read** 入口。
看完这一份之后，再按需要进入细分 canonical docs：
- `export_multi_agent_architecture.md`
  - 未来 bounded-chain architecture
- `export_prompt_contract.md`
  - prompt ownership 与 stage contract
- `export_prompt_inventory.md`
  - shipped vs target runtime inventory
- `export_compression_current_architecture.md`
  - 当前 shipped implementation snapshot
- `cross_platform_conversation_normalization_architecture.md`
  - pre-`E0` 的跨平台归一化与语义标注层

## Immediate follow-up tracks

### Follow-up A: Export panel wording and light visual absorption

这是 presentation-only follow-up。
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

这是 prompt-engineering follow-up。
允许吸收的方向：
- 更明确的 exemplar-based output anchoring
- 更强的 decision rationale 要求
- 更强的 reusable code completeness 要求
- 把 summary 更明确地 framing 成 knowledge artifact

不允许做的事：
- 替换当前 shipping headings
- 为中文 schema 开双轨 validator
- 借 prompt 调优之名，实际重写 public export contract

## Working conclusion

Vesti 已经有一条真实可运行的 AI Handoff 路径，但它目前仍然处在 bridge state：
- runtime path 已经存在
- contract 已经存在
- diagnostics 已经存在
- multi-agent decomposition 还没有真正拆开

这轮修订要强调的是：
- `E1/E2` 应被视为 mode-parameterized shared stages
- 当前 profile 路由只是 bridge-state，不是最终 task/model 解耦
- 对跨平台场景而言，`P0/P1` pre-`E0` 层是架构必需品，而不是实现细节

下一步不应该是继续做无边界的压缩，而应该是：
- 继续提高 AI Handoff 对 task state 的保真度
- 然后在不破坏 shipping compact contract 的前提下，把 planner / compactor / composer 逐步拆成 bounded chain