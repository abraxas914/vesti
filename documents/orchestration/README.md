# Orchestration Documentation Package

Status: Active canonical documentation tree for generic runtime orchestration contracts  
Audience: Runtime engineers, release owners, QA

## Purpose

`documents/orchestration/` exists to hold cross-product runtime contracts only.

It owns:
- generic pipeline progress/event contracts
- generic tool-trace contracts
- runtime-facing orchestration semantics that can be shared across features

It does not own:
- export prompt artifact design
- Insights feature-specific product architecture
- Explore product-specific UI flow design
- dated rollout narratives for legacy product lines

## Active canonical docs

- `README.md`
- `v1_7_runtime_event_contract.md`
- `tool_trace_contract.md`

These docs are generic by design, but export bounded pipelines are now one of their primary reuse targets.

## Relationship to export docs

Export-specific workflow, schema, and prompt decisions stay in:
- `documents/prompt_engineering/export_multi_agent_architecture.md`
- `documents/prompt_engineering/export_stage_artifact_schemas.md`
- `documents/prompt_engineering/export_workflow_runner_spec.md`

`documents/orchestration/` only supplies reusable runtime contracts such as:
- progress event shape
- stage/trace semantics
- generic bounded workflow visibility rules

## Legacy references

Older product-specific orchestration specs now live under:
- `documents/archive/orchestration/legacy_insights/`
- `documents/archive/orchestration/legacy_explore/`

Those files remain useful as historical implementation references, but they are not active canonical docs.