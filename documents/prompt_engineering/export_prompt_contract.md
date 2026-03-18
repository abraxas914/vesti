# Export Prompt Contract

Status: Active canonical contract  
Audience: Prompt engineers, runtime engineers

First-read note:
- For expert-facing bridge docs and the pre-`E0` boundary, start with:
  - `export_ai_handoff_architecture.md`
  - `export_knowledge_export_architecture.md`
  - `cross_platform_conversation_normalization_architecture.md`
  - `export_stage_artifact_schemas.md`
  - `export_workflow_runner_spec.md`

## Purpose

Define the long-term runtime ownership and artifact boundaries for export prompts.

## Runtime source of truth

The only long-term runtime prompt source is:
- `frontend/src/lib/prompts/**`

Documentation in `documents/prompt_engineering/**` defines contracts and governance, but it is not the runtime prompt text authority.

## Target prompt layout

Export prompts should converge to this structure:

- `frontend/src/lib/prompts/export/e1HandoffStructurePlanner.ts`
- `frontend/src/lib/prompts/export/e1KnowledgeStructurePlanner.ts`
- `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts`
- `frontend/src/lib/prompts/export/e2KnowledgeEvidenceCompactor.ts`
- `frontend/src/lib/prompts/export/compactComposer.ts`
- `frontend/src/lib/prompts/export/summaryComposer.ts`
- `frontend/src/lib/prompts/export/repairCompact.ts`
- `frontend/src/lib/prompts/export/repairSummary.ts`
- `frontend/src/lib/prompts/export/shared.ts`

Current shipped `E3` ownership is already partially aligned:
- `frontend/src/lib/prompts/export/compactComposer.ts`
- `frontend/src/lib/prompts/export/summaryComposer.ts`

Dormant `E1` draft artifacts now exist for review and decomposition prep, but they are not yet wired into runtime:
- `frontend/src/lib/prompts/export/e1HandoffStructurePlanner.ts`
- `frontend/src/lib/prompts/export/e1KnowledgeStructurePlanner.ts`

Handoff-only offline prototype artifacts now also exist for distillation work, but they are not runtime-active:
- `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts`
- `frontend/src/lib/prompts/export/e3HandoffComposerFromEvidence.ts`
- `frontend/src/lib/prompts/export/distillPrototype.ts`
- `scripts/export-distill-prototype.ts`

Legacy compatibility re-export files remain temporarily:
- `frontend/src/lib/prompts/exportCompact.ts`
- `frontend/src/lib/prompts/exportSummary.ts`

Supporting domain folders:
- `frontend/src/lib/prompts/explore/`
- `frontend/src/lib/prompts/legacy/insights/`

The prompt registry entrypoint remains:
- `frontend/src/lib/prompts/index.ts`

## Export artifact contract

The long-term export contract now distinguishes between:
- shared stage slots
- separate prompt artifacts
- mode-specific schema families

`Compact` and `Summary` may share orchestration position and artifact boundaries for `E1/E2`, but they should not be treated as requiring one neutral prompt body.

### `export_e1_handoff_structure_planner`
- stage: `E1`
- mode: `handoff`
- input: export dataset metadata + ordered messages + locale + profile
- output: `HandoffPlanningNotes`
- status: draft prompt artifact only, not runtime-active yet

### `export_e1_knowledge_structure_planner`
- stage: `E1`
- mode: `knowledge`
- input: export dataset metadata + ordered messages + locale + profile
- output: `KnowledgePlanningNotes`
- status: draft prompt artifact only, not runtime-active yet

### `export_e2_handoff_evidence_compactor`
- stage: `E2`
- mode: `handoff`
- input: dataset + `HandoffPlanningNotes`
- output: `HandoffEvidenceSkeleton`
- status: draft prompt artifact, currently used only by the offline handoff distillation prototype

### `export_e2_knowledge_evidence_compactor`
- stage: `E2`
- mode: `knowledge`
- input: dataset + `KnowledgePlanningNotes`
- output: `KnowledgeEvidenceSkeleton`

### `export_e3_compact_composer`
- stage: `E3`
- mode: `handoff`
- input: `CompactComposerInput`
- output: compact markdown under the shipping headings
- current shipping runtime still starts here from raw transcript payloads

### `export_e3_summary_composer`
- stage: `E3`
- mode: `knowledge`
- input: `SummaryComposerInput`
- output: summary markdown under the shipping headings

### `export_e3_handoff_composer_from_evidence`
- stage: `E3`
- mode: `handoff`
- input: `CompactComposerInput` backed by `HandoffEvidenceSkeleton`
- output: compact markdown under the shipping headings
- status: offline-only prototype composer used to validate that `E3` can consume evidence instead of raw transcript

### `export_compact_repair`
- stage: repair path after invalid structured compact output
- mode: `handoff`
- input: `RepairInput`
- output: repaired compact markdown candidate

### `export_summary_repair`
- stage: repair path after invalid structured summary output
- mode: `knowledge`
- input: `RepairInput`
- output: repaired summary markdown candidate

## Upstream dependency before `E0`

For cross-platform conversation ingestion, export depends on an upstream boundary before `E0`:
- `P0 platform_normalizer`
- `P1 semantic_annotator`

`P1` outputs a structured sidecar annotation layer. Those stages are documented in:
- `cross_platform_conversation_normalization_architecture.md`
- `export_stage_artifact_schemas.md`

They are not part of the export composer contract itself, but they materially affect the quality ceiling of `E0` onward.

## Profile decomposition direction

Current shipped profile names are bridge-state identifiers:
- `kimi_handoff_rich`
- `step_flash_concise`

They are sufficient for the current shipped path, but they do not represent the long-term contract cleanly because they mix:
- model identity
- task/output intent

The target direction is a two-axis decomposition:
- model axis: `kimi`, `step`, future compatible models
- task axis: `handoff`, `knowledge`

Phase 1 activation is intentionally narrower:
- `kimi + handoff`
- `kimi + knowledge`

## Contract rules

- `frontend/src/lib/services/**` must not become the long-term home for new prompt text
- service-local prompts already present in runtime services are migration debt
- `frontend/src/lib/prompts/index.ts` should remain a registry, not a mixed domain implementation dump
- export prompt payload types belong in `frontend/src/lib/prompts/types.ts`
- `E1/E2` output contracts must remain structured artifacts, not final markdown
- the current shipping runtime still begins at `E3`; dormant and prototype artifacts must be labeled clearly until they are actually wired into runtime

## Offline distillation prototype

The current handoff-only distillation prototype exists to answer one question: can `P1 -> E1 -> E2 -> E3` run once as a bounded offline chain and still satisfy the live compact headings contract?

Prototype scope:
- handoff only
- TypeScript / Node runner under `scripts/export-distill-prototype.ts`
- heuristic `P1`, not LLM-assisted annotation
- one-shot repair only, never recursive

Prototype non-goals:
- it does not replace the shipping `exportCompression.ts` path
- it does not activate `Knowledge Export` runtime decomposition yet
- it does not reopen the live payload contract or exact headings

## Current migration debt

The following locations still contain long-lived prompt text or repair text that should eventually migrate out:
- `frontend/src/lib/services/insightGenerationService.ts`
- `frontend/src/lib/services/searchService.ts`

This debt is tracked, not blessed.
