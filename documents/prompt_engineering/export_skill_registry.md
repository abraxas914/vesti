# Export Skill Registry

Status: Active canonical governance inventory  
Audience: Prompt engineers, runtime engineers, validator authors

## Purpose

Define the Phase 1 skill governance surface for export decomposition:
- which skill IDs are valid in planning notes
- which upstream P1 signals currently exist in code
- which skills are planning-visible now versus placeholder-only
- which rules govern future skill changes

This document is a governance and design source of truth. It is not the runtime prompt text source.

Runtime prompt source of truth remains:
- `frontend/src/lib/prompts/**`

## Authority boundaries

The prompt-engineering docs split responsibility like this:

- `export_prompt_contract.md`
  - invariants every skill-aware implementation must obey
- `export_stage_artifact_schemas.md`
  - shared artifact shapes for `P1/E0/E1/E2/E3/repair`
- `export_skill_registry.md`
  - valid skill IDs, activation semantics, and Phase 1 governance status
- `export_prompt_inventory.md`
  - where current runtime and offline prototype pieces live

Conflict handling:
- if a skill is documented here but not recognized by planning validation, the implementation is incomplete
- if code emits a skill ID not registered here, that is a governance bug
- if a new skill changes prompt behavior, this registry and the relevant schema doc must be updated in the same PR

## Entry model

Each registered skill should define:

| Field | Meaning |
| --- | --- |
| `id` | stable identifier in the form `skill:<name>` |
| `stage` | primary stage slot that consumes the skill |
| `mode` | `handoff`, `knowledge`, or `both` |
| `status` | `planning_visible`, `draft_runtime`, or `placeholder_only` |
| `p1SignalSource` | which implemented P1 cue currently supports the skill |
| `phase1Role` | whether the skill is allowed in `requiredSkills`, `baselineTriggered`, or only as a future placeholder |
| `sopSummary` | concise extraction intent |
| `source` | runtime prompt or implementation file that will eventually consume the skill |

## Phase 1 planning-visible skills

These skill IDs are valid in Phase 1 planning notes today.

| Skill ID | Stage | Mode | Status | P1 signal source | Phase 1 role | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `skill:artifact_extraction` | `E2` | `both` | `planning_visible` | `artifact_marker` | may appear in `requiredSkills`; enters `baselineTriggered` when artifact density is clearly grounded | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |
| `skill:decision_extraction` | `E2` | `both` | `planning_visible` | `confirmed_decision` | may appear in `requiredSkills`; may enter `baselineTriggered` on strong repeated decision cues | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |
| `skill:user_constraints` | `E2` | `both` | `planning_visible` | `user_constraint_cue` | may appear in `requiredSkills`; may enter `baselineTriggered` from explicit user constraints | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |
| `skill:theoretical_context` | `E2` | `both` | `planning_visible` | `theory_definition_cue` | may appear in `requiredSkills` only; no Phase 1 baseline trigger | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |
| `skill:data_reference` | `E2` | `both` | `planning_visible` | `quantitative_data_cue` | may appear in `requiredSkills` only; no Phase 1 baseline trigger | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |
| `skill:unresolved_next_steps` | `E2` | `both` | `planning_visible` | `unresolved_cue` | may appear in `requiredSkills` only; no Phase 1 baseline trigger | `frontend/src/lib/prompts/export/e2HandoffEvidenceCompactor.ts` |

Phase 1 note:
- planning-visible means the skill can appear in prototype planning notes
- it does not mean E2 already has a dedicated conditional extraction block for that skill
- Phase 1 is planning visibility only, not runtime skill execution

## Placeholder-only skills

These registry entries are future placeholders. They are not valid Phase 1 planning-note IDs.

| Skill ID | Stage | Status | Why placeholder-only right now |
| --- | --- | --- | --- |
| `skill:correction_trace` | `E2` | `placeholder_only` | depends on a correction-specific upstream signal that is not implemented in Phase 1 |
| `skill:code_provenance` | `E2` | `placeholder_only` | no Phase 1 schema or prompt consumer exists yet |
| `skill:version_lineage` | `E2` | `placeholder_only` | no Phase 1 schema or prompt consumer exists yet |

## Current P1 signal mapping

### Implemented cues

These cues exist in the current `distillPrototype.ts` heuristic annotator and are valid Phase 1 inputs.

| P1 label | Meaning | Skill relationship |
| --- | --- | --- |
| `artifact_marker` | code blocks, commands, paths, or other artifact-like references | drives `skill:artifact_extraction` |
| `confirmed_decision` | explicit decision or locked-path wording | drives `skill:decision_extraction` |
| `unresolved_cue` | explicit follow-up, unresolved work, or next-step language | drives `skill:unresolved_next_steps` |
| `user_constraint_cue` | explicit user preference, restriction, or negative requirement | drives `skill:user_constraints` |
| `theory_definition_cue` | definition, theorem, principle, or concept-framing language | drives `skill:theoretical_context` |
| `quantitative_data_cue` | metrics, measured values, benchmark-like evidence, or cited data | drives `skill:data_reference` |

### Reserved but not implemented in Phase 1

These names may appear in long-term architecture discussion, but they are not active Phase 1 signals.

| Label | Status |
| --- | --- |
| `correction_turn` | reserved for future implementation; not valid as a Phase 1 baseline dependency |
| `tentative_decision` | reserved for future implementation |
| `reusable_snippet_cue` | reserved for future implementation |

## E1 planning contract in Phase 1

Planning notes may expose two skill-related fields:

```ts
interface PlanningNotesBase {
  requiredSkills?: string[];
  baselineTriggered?: string[];
}
```

Phase 1 rules:
- both fields remain optional in the shared TypeScript schema for backward compatibility
- the offline prototype should emit them explicitly, using `[]` when no grounded skill applies
- every emitted skill ID must come from the Phase 1 planning-visible set listed above
- `baselineTriggered` is reserved for skills forced directly by implemented P1 cues
- `requiredSkills` may include both baseline-triggered skills and additional planning-visible skills inferred conservatively from grounded evidence

## Governance rules

1. No new skill ID may appear in runtime planning output unless it is first registered here.
2. A Phase 1 skill may become runtime-active later, but that does not change its ID.
3. Skill changes must not weaken the invariants in `export_prompt_contract.md`.
4. Phase 1 must not use `correction_turn` as a current dependency in registry, schema, validator, or prototype acceptance criteria.
5. Phase 1 must not treat planning-visible skills as proof that E2 already consumes them.

## Version history

| Version | Date | Change |
| --- | --- | --- |
| `v0.2.0` | 2026-03-20 | Reframed registry around Phase 1 planning visibility, removed `correction_turn` from current baseline dependencies, and aligned valid skill IDs with prototype validation |
