# Reader Pipeline Documentation Package

Status: Active canonical documentation tree for reader, export, compression, insights, and schema-consumer evolution  
Audience: Reader maintainers, data pipeline engineers, web/dashboard contributors, QA

## Purpose

`documents/reader_pipeline/` 是 reader / data-pipeline 方向的 current source of truth。
它负责回答：

- capture 持久化结果进入 reader / export / compression / insights / web 之后的消费规范
- conversation package 与时间语义
- reader / data schema 的演进边界
- 迁移、验收、回归操作口径

它不负责：

- 原始 DOM discovery 和 parser normalization 细节
- capture governance 模式本身
- dated handoff 快照

## Canonical Docs

- `reader_pipeline_engineering_spec.md`
  - 主规格。定义 reader pipeline 的目标、共享 content package、统一时间语义和各消费端规则
- `reader_pipeline_current_architecture.md`
  - 只读诊断。解释当前 reader / export / compression / insights / web 链路哪些边界已经合理，哪些地方仍在漂移
- `reader_pipeline_operational_playbook.md`
  - 操作文档。统一迁移验证、reader fidelity 检查、导出检查、时间语义回归和 release gate

## Recommended Reading Order

1. `reader_pipeline_engineering_spec.md`
2. `reader_pipeline_current_architecture.md`
3. `reader_pipeline_operational_playbook.md`

## Historical Migration Note

旧版 `v1_6_*` spec、manual sampling 和 AST cheat sheet 已迁入
`documents/archive/reader_pipeline/`。它们继续保留以便追溯，但不再作为当前实现决策的
source of truth。

## Archive Mapping

| 历史材料组 | 归档位置 |
| --- | --- |
| 旧 spec / migration / fallback docs | `../archive/reader_pipeline/superseded_specs/` |
| 旧 manual sampling / acceptance | `../archive/reader_pipeline/legacy_playbooks/` |
| 旧 AST probe / cheat sheet | `../archive/reader_pipeline/reference_cheat_sheets/` |
