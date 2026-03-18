# 2026-03-18 Export Shipped Prompt Review Package

Status: Active review prep memo  
Audience: Internal team, external prompt/domain experts

## Purpose

This note defines the smallest useful package for expert review of the **currently shipped export prompts**.

It exists to keep the next expert pass focused on:
- prompt contract alignment
- decomposition direction
- shipped `E3` quality limits
- stronger recall framing for `summary`
- section-level exemplar effectiveness
- reusable pattern / insight anchoring
- fallback conservatism versus compliance

It does **not** ask the expert to review the full repo or legacy prompt surface.

## What is already settled before prompt review

These higher-level architecture decisions are already documented and should be treated as the current baseline:
- export remains a bounded pipeline, not an open-ended agent loop
- `AI Handoff` and `Knowledge Export` remain two long-lived paths
- cross-platform complexity is front-loaded into `P0/P1`, not pushed into export stages
- phase 1 delivery order remains:
  1. stabilize `AI Handoff`
  2. expand `Knowledge Export`

Relevant docs:
- `documents/prompt_engineering/export_ai_handoff_architecture.md`
- `documents/prompt_engineering/export_knowledge_export_architecture.md`
- `documents/prompt_engineering/cross_platform_conversation_normalization_architecture.md`
- `documents/prompt_engineering/export_workflow_runner_spec.md`

## Current shipped prompt sources

The current shipped export prompts to review are:
- `frontend/src/lib/prompts/export/compactComposer.ts`
- `frontend/src/lib/prompts/export/summaryComposer.ts`

Dormant extraction-prep drafts also exist now for review, but are not runtime-active:
- `frontend/src/lib/prompts/export/e1HandoffStructurePlanner.ts`
- `frontend/src/lib/prompts/export/e1KnowledgeStructurePlanner.ts`

Registry entry:
- `frontend/src/lib/prompts/index.ts`

Runtime caller:
- `frontend/src/sidepanel/utils/exportCompression.ts`

Compatibility re-export shims still exist here:
- `frontend/src/lib/prompts/exportCompact.ts`
- `frontend/src/lib/prompts/exportSummary.ts`

## Recommended expert review package

Send only this bundle:

### Architecture context
- `documents/prompt_engineering/export_ai_handoff_architecture.md`
- `documents/prompt_engineering/export_knowledge_export_architecture.md`
- `documents/prompt_engineering/export_workflow_runner_spec.md`

### Current shipped prompt text
- `frontend/src/lib/prompts/export/compactComposer.ts`
- `frontend/src/lib/prompts/export/summaryComposer.ts`

### Dormant extraction-prep prompt drafts
- `frontend/src/lib/prompts/export/e1HandoffStructurePlanner.ts`
- `frontend/src/lib/prompts/export/e1KnowledgeStructurePlanner.ts`

### Real output samples
At least:
- one `compact` success or near-success sample
- one `compact` fallback sample
- one `summary` success or near-success sample
- one diagnostics sample showing invalid reasons

## What to ask the expert in that prompt review round

Keep the prompt-review ask narrow:

1. Does `summaryComposer` now make future human recall the first priority strongly enough, or is the framing still too close to timeline reconstruction?
2. Do the updated `Reusable Snippets` anchors finally point toward reusable pattern / insight artifacts, rather than defaulting to file references?
3. Are the fallback prompts now conservative-in-compliance, or do they still read as merely shorter versions of the main composer?
4. Do the dormant `E1` planner drafts look like the right first step for moving extraction pressure forward out of `E3`?

## What not to ask in that round

- do not ask for repo-wide prompt cleanup
- do not ask for full orchestration framework advice again
- do not ask the expert to re-decide `P0/P1/E0` boundaries
- do not ask for shipping schema replacement unless the team is ready to reopen the contract

## Working conclusion

The next expert prompt-review round should be about whether `summary` now reads like a real knowledge artifact, whether the new snippet anchors point toward reusable patterns or insights, whether fallback is now conservative-in-compliance instead of merely shorter, and whether the dormant `E1` drafts are the right first extraction move.
