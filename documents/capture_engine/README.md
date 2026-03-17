# Capture Engine Documentation Package

Status: Active canonical documentation tree for capture, parser, and conversation archival work  
Audience: Parser maintainers, runtime engineers, QA, release owners, reader/export pipeline contributors

## Purpose

`documents/capture_engine/` 是 capture engine 的唯一 current source of truth。

本目录负责：
- capture / parser / observer / pipeline 的工程边界
- DOM discovery、boundary inference、platform normalization、shared extraction 的规范
- capture 到 reader / export / compression / search 的信息保真目标
- 采样、调试、验收与 release gate 的统一操作规则

本目录不负责：
- web dashboard 产品化规格
- 全局 UI / IA / component system 契约
- 带日期的 handoff 快照

## Canonical Docs

- `capture_engine_engineering_spec.md`
  - 主规格。定义 capture engine 的目标、非协商原则、目标内容包 contract 与推荐分层架构。
- `capture_engine_current_architecture.md`
  - 当前实现诊断。解释哪些边界已经合理，哪些 parser 仍然偏 ad hoc，以及离目标架构还有多远。
- `capture_engine_operational_playbook.md`
  - 操作文档。统一 DOM 采样模板、fault taxonomy、QA matrix、证据包与 release gate。

## Recommended Reading Order

1. `capture_engine_engineering_spec.md`
2. `capture_engine_current_architecture.md`
3. `capture_engine_operational_playbook.md`

## Historical Migration Note

旧版 `v1_2_*`、`v1_3_*`、`v1_4_*`、`v1_5_*`、legacy playbook、manual sampling checklist、execution log 已迁入 `documents/archive/capture_engine/`。

这些历史文件继续保留以便追溯，但不再作为当前实现决策的 source of truth。

## Archive Mapping

| 历史材料组 | 归档位置 |
| --- | --- |
| 旧 spec / retrospective / roadmap | `../archive/capture_engine/superseded_specs/` |
| 旧 playbook | `../archive/capture_engine/legacy_playbooks/` |
| execution logs | `../archive/capture_engine/execution_logs/` |
| manual sampling checklists | `../archive/capture_engine/sampling_checklists/` |
