# Export Prompt Contract

Status: Active canonical contract  
Audience: Prompt engineers, runtime engineers

First-read note:
- For expert-facing bridge documents that explain why compact and summary exist, how the current shipped paths work, and where the contract is heading, start with:
  - `export_ai_handoff_architecture.md`
  - `export_knowledge_export_architecture.md`

## Purpose

Define the long-term runtime ownership and artifact boundaries for export prompts.

## Runtime source of truth

The only long-term runtime prompt source is:
- `frontend/src/lib/prompts/**`

Documentation in `documents/prompt_engineering/**` defines contracts and governance, but it is not the runtime prompt text authority.

## Target prompt layout

Export prompts should converge to this structure:

- `frontend/src/lib/prompts/export/structurePlanner.ts`
- `frontend/src/lib/prompts/export/evidenceCompactor.ts`
- `frontend/src/lib/prompts/export/compactComposer.ts`
- `frontend/src/lib/prompts/export/summaryComposer.ts`
- `frontend/src/lib/prompts/export/repair.ts`
- `frontend/src/lib/prompts/export/shared.ts`

Supporting domain folders:
- `frontend/src/lib/prompts/explore/`
- `frontend/src/lib/prompts/legacy/insights/`

The prompt registry entrypoint remains:
- `frontend/src/lib/prompts/index.ts`

## Export artifact contract

The long-term export contract now distinguishes between:
- shared stage slots
- mode-parameterized implementations

`Compact` and `Summary` may share orchestration position and artifact boundaries for `E1/E2`, but they should not be treated as requiring one neutral prompt body.

### `export_e1_structure_planner`
- stage: `E1`
- input: export dataset metadata + ordered messages + mode + locale + profile
- implementation rule: shared stage slot, mode-parameterized prompt behavior
- output: planning notes only

### `export_e2_evidence_compactor`
- stage: `E2`
- input: dataset + planning notes
- implementation rule: shared stage slot, mode-parameterized extraction behavior
- output: evidence skeleton with reasoning, artifacts, decisions, unresolved work

### `export_e3_compact_composer`
- stage: `E3`
- input: evidence skeleton + profile
- output: compact markdown under the shipping headings

### `export_e3_summary_composer`
- stage: `E3`
- input: evidence skeleton + profile
- output: summary markdown under the shipping headings

### `export_repair`
- stage: repair path after invalid structured output
- input: failed output + expected contract context
- output: repaired markdown candidate

## Upstream dependency before `E0`

For cross-platform conversation ingestion, export depends on an upstream boundary before `E0`:
- `P0 platform_normalizer`
- `P1 semantic_annotator`

Those stages are documented in:
- `cross_platform_conversation_normalization_architecture.md`

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

## Contract rules

- `frontend/src/lib/services/**` must not become the long-term home for new prompt text
- service-local prompts already present in runtime services are migration debt
- `frontend/src/lib/prompts/index.ts` should remain a registry, not a mixed domain implementation dump
- export prompt payload types belong in `frontend/src/lib/prompts/types.ts`

## Current migration debt

The following locations still contain long-lived prompt text or repair text that should eventually migrate out:
- `frontend/src/lib/services/insightGenerationService.ts`
- `frontend/src/lib/services/searchService.ts`

This debt is tracked, not blessed.
