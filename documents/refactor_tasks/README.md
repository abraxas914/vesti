# Refactor Tasks Directory

Status: Active implementation backlog entrypoint  
Audience: Engineers running cross-subsystem refactors, release owners

## Purpose

`documents/refactor_tasks/` 用来承接跨 `capture_engine` 和 `reader_pipeline` 的主动实施任务。
它不是新的 canonical spec 目录。规范和现状诊断仍然以这两处为准：

- `documents/capture_engine/`
- `documents/reader_pipeline/`

这里主要回答三类问题：

- 下一轮具体要做什么
- 先后顺序怎么排
- 哪些事项已经完成，哪些仍待推进

## Task Ledgers

- `capture_engine_refactor_tasks.md`
  - capture/parser 分层、content package 扩展、多模态保留与治理不变前提下的实施任务
- `reader_pipeline_refactor_tasks.md`
  - reader/export/compression/insights/web 统一消费 contract 的实施任务
- `timestamp_semantics_rollout_tasks.md`
  - 线程时间语义从 schema、capture、UI、export 到 web 的 rollout 任务，以及当前展示冲突摘要

## Recommended Reading Order

1. 先读对应 canonical spec
2. 再读 current architecture
3. 最后回到这里看实施任务和切片顺序

## Current Note

如果问题直接涉及 “Threads / Reader / Web 到底在显示哪一个时间”，优先阅读
`timestamp_semantics_rollout_tasks.md`，它已经收录当前展示层的只读诊断摘要。
