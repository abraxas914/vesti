# Reader Pipeline Refactor Tasks

Status: Active task ledger  
Audience: Reader maintainers, export/compression owners, web contributors

## Goal

把 reader pipeline 从“各 consumer 各自有一套时间和结构逻辑”的状态，
推进到共享 conversation package 与统一时间语义的状态。

## Track 1. Shared Timestamp Helpers

- 所有 consumer 统一复用 `originAt / captureFreshnessAt / recordModifiedAt`
- timeline / list / weekly chronology 统一按 `originAt`
- 卡片副文案统一按 `captureFreshnessAt`

## Track 2. Reader and Web Parity

- sidepanel reader header 与 web reader header 对齐
- web library 列表时间口径与 sidepanel 对齐
- 清理 prototype 中的硬编码日期与旧类型漂移

## Track 3. Export and Compression Alignment

- JSON / MD / TXT 输出新时间字段与新文案
- compression / summary / weekly prompt 全部接入 `originAt`
- 不再让 `updated_at` 继续充当线程起点

## Track 4. Structure Fidelity Expansion

- AST consumer 为 attachment / artifact / citation 预留一致渲染策略
- export consumer 为这些结构预留明确表达方式
- insights/search 逐步从 text-centric 迈向 package-centric

## Current Slice Recommendation

当前建议顺序：

1. 统一 helper 与 schema / 类型
2. sidepanel / insights / export 对齐
3. web parity
4. content package 扩展与 richer consumer 支持
