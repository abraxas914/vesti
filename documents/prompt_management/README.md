# Prompt Management

Documentation for Vesti's Prompt Management feature (dashboard Prompts tab +
in-page prompt assist).

## Documents

- [`prompt_management_engineering_spec.md`](prompt_management_engineering_spec.md)
  — architecture, data model, phasing, and acceptance criteria.
- [`prompt_management_manual_acceptance.md`](prompt_management_manual_acceptance.md)
  — manual sampling / acceptance checklist for QA.

## Surfaces at a glance

| Surface | Entry point | Notes |
|---------|-------------|-------|
| Prompts tab | `packages/vesti-ui/src/tabs/prompts-tab.tsx` | Library CRUD, extract-from-chats, AI improve |
| Engine (offline) | `frontend/src/lib/promptlib/` | normalize / heuristics / extractor (no LLM) |
| Persistence | `frontend/src/lib/db/promptRepository.ts` + `prompts` store (schema v17) | |
| LLM enrichment/completion | `frontend/src/lib/services/promptLlmService.ts` | graceful degradation |
| In-page assist | `frontend/src/contents/prompt-assist.ts` | slash `/v` insert + 补写 |
| Transport | `LIST/SEARCH/CREATE/UPDATE/DELETE/TOGGLE/INCREMENT/EXTRACT/COMPLETE` prompt routes | protocol + offscreen |

## Design principles

LLM is always optional (heuristics fall back), all data is local IndexedDB, the
in-page script writes to the composer only on explicit user action and never
auto-submits, and new code lives in isolated paths per `CLAUDE.md`.
