# Export Multi-Agent Architecture

Status: Active canonical architecture note  
Audience: Prompt engineering, runtime engineering, release owner

First-read note:
- For an expert-facing bridge document that combines current shipped behavior with the future bounded-chain direction, start with:
  - `export_ai_handoff_architecture.md`
  - `export_knowledge_export_architecture.md`

## Purpose

Define the export-centric multi-agent baseline that supersedes Insights as the main product architecture for prompt work.

This document treats export as the primary bounded agent workflow and borrows only selected patterns from Explore and legacy Insights.

## Core design

For internal Vesti threads, export can currently be reasoned about from `E0` onward.
For cross-platform ingestion, the effective upstream boundary is:

0. `P0 platform_normalizer`
- deterministic structural normalization across source platforms

1. `P1 semantic_annotator`
- heuristic / semantic labeling that prepares higher-quality downstream state

Export itself is modeled as a bounded four-stage chain:

2. `E0 dataset_builder`
- deterministic local stage
- input: selected threads, messages, conversation metadata, export mode, locale
- output: normalized export dataset

3. `E1 structure_planner`
- LLM-assisted planning stage
- identifies task emphasis such as handoff density, artifact density, unresolved density, and summary focus
- shared stage slot, but mode-parameterized in implementation
- output: compact planning notes for downstream composition

4. `E2 evidence_compactor`
- LLM-assisted evidence distillation stage
- extracts reasoning chain, constraints, decisions, artifacts, and unresolved work
- shared stage slot, but mode-parameterized in implementation
- output: intermediate evidence skeleton

5. `E3 export_composer`
- LLM-assisted final composition stage
- turns the E2 skeleton into either `Compact` or `Summary`
- applies model-profile-specific prompt profile selection
- supports repair and deterministic fallback

## Product boundaries

- `Compact` and `Summary` share `E0 -> E2` as stage slots and artifact boundaries, but not as mode-agnostic prompt implementations
- `Compact` and `Summary` diverge semantically before `E3`; the future architecture must treat `E1/E2` as mode-parameterized shared stages
- `Full` remains a deterministic local export and does not enter the agent chain
- the export chain is bounded and single-pass by design
- no open-ended reflective loops or autonomous retry trees are part of the baseline
- Explore's tool taxonomy is not copied into export verbatim

## Borrowed patterns

### Borrowed from legacy Insights
- compaction-style evidence distillation as a distinct intermediate stage
- explicit fallback-aware pipeline thinking
- structured downstream composition rather than one-shot summary generation

### Borrowed from Explore
- bounded chain semantics
- visible tool / stage trace potential
- context compiler mindset for intermediate artifacts

### Explicitly not borrowed
- Insights as the product mother-architecture
- Explore session model and UI structure
- long-lived generic agent taxonomies shared by every feature

## Model-profile routing

Export composition remains profile-aware:
- `kimi_handoff_rich`
- `step_flash_concise`
- legacy compatibility profiles may remain for rollback, but do not define the active architecture

Current shipped profile routing is still a bridge-state abstraction. It mixes:
- model choice
- task/output strategy

The target decomposition should separate:
- model axis: `kimi`, `step`, future compatible models
- task axis: `handoff`, `knowledge`

Model profile affects:
- prompt budget
- response-format strategy
- composer prompt profile
- repair/fallback expectations

## Relationship to current shipped export compression

Current production export compression remains the live shipping path.

That path is documented in:
- `export_compression_current_architecture.md`

This document is the forward-looking canonical architecture for the next cleanup and decomposition phase.
