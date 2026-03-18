# Export Prompt Inventory

Status: Active canonical inventory  
Audience: Prompt engineering, runtime engineering, maintainers

First-read note:
- For expert-facing bridge docs and the phase 1 workflow shape, start with:
  - `export_ai_handoff_architecture.md`
  - `export_knowledge_export_architecture.md`
  - `cross_platform_conversation_normalization_architecture.md`
  - `export_stage_artifact_schemas.md`
  - `export_workflow_runner_spec.md`

## Purpose

Keep a single 1:1 inventory of export runtime entries, prompt artifacts, profiles, and migration debt.

## Active shipping inventory

Note:
- Current shipping inventory begins at `E0` because that is the live export runtime boundary.
- In cross-platform scenarios, `E0` depends on upstream normalization and semantic annotation documented in `cross_platform_conversation_normalization_architecture.md`.

| Stage | Runtime entry | Prompt source | Profiles | Output |
| --- | --- | --- | --- | --- |
| `E0 dataset_builder` | `frontend/src/sidepanel/utils/exportConversations.ts` + export dataset helpers | none (deterministic) | n/a | normalized export dataset |
| `E3 compact composer` | `frontend/src/sidepanel/utils/exportCompression.ts` | `frontend/src/lib/prompts/export/compactComposer.ts` | `kimi_handoff_rich`, `step_flash_concise` | compact markdown |
| `E3 summary composer` | `frontend/src/sidepanel/utils/exportCompression.ts` | `frontend/src/lib/prompts/export/summaryComposer.ts` | `kimi_handoff_rich`, `step_flash_concise` | summary markdown |

The current shipped profiles are also a bridge-state compromise:
- `summary` still reuses handoff-oriented profile names
- task intent and model identity are not yet decomposed into separate routing axes
- compatibility re-export stubs still exist at `frontend/src/lib/prompts/exportCompact.ts` and `frontend/src/lib/prompts/exportSummary.ts` to avoid breaking existing imports while ownership is being cleaned up

## Target phase 1 inventory after decomposition

| Stage | Prompt artifact / implementation | Target runtime location | Phase 1 activation |
| --- | --- | --- | --- |
| `P0` | source normalization rules | upstream ingestion / normalization layer | active |
| `P1` | structured sidecar annotation rules | upstream ingestion / annotation layer | active, heuristic-first |
| `E1 handoff` | `export_e1_handoff_structure_planner` | `frontend/src/lib/prompts/export/e1HandoffStructurePlanner.ts` | `kimi + handoff` |
| `E1 knowledge` | `export_e1_knowledge_structure_planner` | `frontend/src/lib/prompts/export/e1KnowledgeStructurePlanner.ts` | `kimi + knowledge` |
| `E2 handoff` | `export_e2_handoff_evidence_compactor` | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` | `kimi + handoff` |
| `E2 knowledge` | `export_e2_knowledge_evidence_compactor` | `frontend/src/lib/prompts/export/e2KnowledgeEvidenceCompactor.ts` | `kimi + knowledge` |
| `E3 compact` | `export_e3_compact_composer` | `frontend/src/lib/prompts/export/compactComposer.ts` | `kimi + handoff` |
| `E3 summary` | `export_e3_summary_composer` | `frontend/src/lib/prompts/export/summaryComposer.ts` | `kimi + knowledge` |
| `repair compact` | `export_compact_repair` | `frontend/src/lib/prompts/export/repairCompact.ts` | on invalid compact output |
| `repair summary` | `export_summary_repair` | `frontend/src/lib/prompts/export/repairSummary.ts` | on invalid summary output |

Notes:
- `E1/E2` remain shared stage slots, but use separate prompt artifacts
- `step` remains a compatibility / fallback line until phase 2 task-specific tuning

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
