# Export Prompt Inventory

Status: Active canonical inventory  
Audience: Prompt engineering, runtime engineering, maintainers

First-read note:
- For expert-facing bridge documents that summarize current AI Handoff and Knowledge Export behavior before drilling into runtime inventory details, start with:
  - `export_ai_handoff_architecture.md`
  - `export_knowledge_export_architecture.md`

## Purpose

Keep a single 1:1 inventory of export runtime entries, prompt artifacts, profiles, and migration debt.

## Active shipping inventory

Note:
- Current shipping inventory begins at `E0` because that is the live export runtime boundary.
- In cross-platform scenarios, `E0` depends on upstream normalization and semantic annotation documented in `cross_platform_conversation_normalization_architecture.md`.

| Stage | Runtime entry | Prompt source | Profiles | Output |
| --- | --- | --- | --- | --- |
| `E0 dataset_builder` | `frontend/src/sidepanel/utils/exportConversations.ts` + export dataset helpers | none (deterministic) | n/a | normalized export dataset |
| `E3 compact composer` | `frontend/src/sidepanel/utils/exportCompression.ts` | `frontend/src/lib/prompts/exportCompact.ts` | `kimi_handoff_rich`, `step_flash_concise` | compact markdown |
| `E3 summary composer` | `frontend/src/sidepanel/utils/exportCompression.ts` | `frontend/src/lib/prompts/exportSummary.ts` | `kimi_handoff_rich`, `step_flash_concise` | summary markdown |

The current shipped profiles are also a bridge-state compromise:
- `summary` still reuses handoff-oriented profile names
- task intent and model identity are not yet decomposed into separate routing axes

## Target inventory after decomposition

| Stage | Target prompt artifact | Target runtime location |
| --- | --- | --- |
| `P0` | source normalization rules | upstream ingestion / normalization layer |
| `P1` | semantic annotation rules | upstream ingestion / annotation layer |
| `E1` | `export_e1_structure_planner` | `frontend/src/lib/prompts/export/structurePlanner.ts` |
| `E2` | `export_e2_evidence_compactor` | `frontend/src/lib/prompts/export/evidenceCompactor.ts` |
| `E3 compact` | `export_e3_compact_composer` | `frontend/src/lib/prompts/export/compactComposer.ts` |
| `E3 summary` | `export_e3_summary_composer` | `frontend/src/lib/prompts/export/summaryComposer.ts` |
| `repair` | `export_repair` | `frontend/src/lib/prompts/export/repair.ts` |

Target decomposition notes:
- `E1/E2` remain shared stage slots, but become mode-parameterized implementations
- profile routing should eventually split into model axis and task axis

## Adjacent systems kept outside export canonical ownership

### Explore
- runtime owner: `frontend/src/lib/services/searchService.ts`
- status: independent feature line
- reuse policy: patterns only, not document-structure inheritance

### Legacy Insights
- runtime owner: `frontend/src/lib/services/insightGenerationService.ts`
- status: compatibility line, not prompt-engineering mainline
- legacy docs archived under `documents/archive/prompt_engineering/legacy_insights/`

## Migration debt inventory

These files still carry prompt-like runtime text outside the target export folder model:
- `frontend/src/lib/services/insightGenerationService.ts`
- `frontend/src/lib/services/searchService.ts`

They remain visible here so future cleanup does not lose track of them.
