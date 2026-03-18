# 2026-03-18 Export Shipped Prompt Review Package

Status: Active review prep memo  
Audience: Internal team, external prompt/domain experts

## Purpose

This note defines the smallest useful package for expert review of the **currently shipped export prompts**.

It exists to keep the next expert pass focused on:
- prompt contract alignment
- decomposition direction
- shipped `E3` quality limits
- section-level exemplar effectiveness
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

### Runtime validator / fallback context
- `frontend/src/sidepanel/utils/exportCompression.ts`

### Real output samples
At least:
- one `compact` success or near-success sample
- one `compact` fallback sample
- one `summary` success or near-success sample
- one diagnostics sample showing invalid reasons

## What to ask the expert in that prompt review round

Keep the prompt-review ask narrow:

1. Do the shipped `E3` prompts actually match the intended task split between `AI Handoff` and `Knowledge Export`?
2. Are the current prompts pushing the model toward the right kind of output contract, or are they still too bridge-state / mixed-purpose?
3. Do the new exemplars anchor the right sections, or are they still too weak / too generic?
4. Are the fallback prompts now conservative-in-compliance, or do they still read as merely shorter versions of the main composer?

## What not to ask in that round

- do not ask for repo-wide prompt cleanup
- do not ask for full orchestration framework advice again
- do not ask the expert to re-decide `P0/P1/E0` boundaries
- do not ask for shipping schema replacement unless the team is ready to reopen the contract

## Working conclusion

The next expert prompt-review round should be about whether the shipped `E3` prompts are good transitional composer prompts, whether the new exemplars anchor the right sections, and whether fallback is now conservative-in-compliance instead of merely shorter.
