# Capture Engine Refactor Tasks

Status: Active task ledger  
Audience: Parser maintainers, runtime engineers, QA

## Goal

把 capture engine 从“外层治理边界基本成型，但 parser 内核仍偏 ad hoc”的状态，
推进到以 `platform normalization` 和 `content package` 为中心的架构。

## Track 1. Parser Layering

- 把 `discovery`、`boundary / role inference`、`platform normalization`、`shared extraction` 拆成正式 stage
- 先从 ChatGPT / Qwen 开刀，作为 reference implementation
- 不再继续把平台私有 DOM 猜测堆进 shared extractor

## Track 2. Content Package Expansion

- 为 `normalized_html_snapshot` 预留持久化位置
- 为 `attachments[] / artifacts[] / citations[] / message_meta` 明确 schema 和 payload 扩展位
- 先保证“存在性保留”，再讨论二进制和高保真渲染

## Track 3. Multimodal Sampling

- GPT：补 uploaded image、generated image、citation-heavy、artifact/canvas case
- 豆包：补图片、搜索卡片、引用、下载产物、CoT/final 双区 case
- 每个 case 产出 DOM snippet、截图、reader 结果和 export 结果

## Track 4. Consumer Alignment

- reader 接住 attachment / artifact / citation 占位
- export / compression / search 继承 content package，而不是继续硬挖 `content_text`
- warm-start / manual transient availability 形成跨平台一致要求

## Current Slice Recommendation

下一轮优先级：

1. ChatGPT / Qwen `platform normalization` stage
2. content package schema slots
3. multimodal sampling and regression fixtures
4. reader / export / compression 对接第一批新结构
