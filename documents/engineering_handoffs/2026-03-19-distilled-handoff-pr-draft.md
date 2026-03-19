# Distilled Handoff Review PR Draft

Status: Draft PR body  
Audience: Internal reviewers

## Title

Seal distilled handoff for review, simplify export feedback UX, and surface proxy token-cap observability

## Summary

This PR seals the current `distilled handoff / experimental compact` line for review instead of expanding scope further.

It does three things:
- keeps the distilled-handoff experiment in a review/observation state
- simplifies user-facing export feedback so the export panel shows product-level guidance instead of developer diagnostics
- keeps richer diagnostics in JSON exports and internal logging, including proxy token-cap observability for experimental handoff

## What changed

### Distilled handoff status
- keeps `experimental compact` positioned as a distilled execution-state handoff
- treats soft density warnings as human-review signals, not as automatic blockers
- keeps `summary` frozen on the shipping note-schema path

### User-facing export UX
- stops rendering `technicalSummary` in the default export-panel callout
- keeps callouts focused on:
  - title
  - detail
  - hint
- simplifies soft-density warning copy so ordinary users are asked to review the downloaded handoff before sharing externally, without exposing token/route metrics in the main UI

### Diagnostics and proxy observability
- keeps rich diagnostics in JSON exports and internal logging
- continues surfacing proxy token-cap observability for experimental handoff
- preserves existing diagnostics needed for internal debugging and expert review

## Validation

- `pnpm -C frontend build`
- `pnpm -C frontend eval:prompts --mode=mock --strict`
- `pnpm -C frontend eval:prompts --mode=mock --strict --variant=experimental`

## Reviewer notes

The proxy-side dependency is already merged separately:
- `vesti-proxy` commit: `9ffea11`

Before validating plugin samples:
1. set `VESTI_CHAT_MAX_TOKENS_LIMIT=5000` in Vercel
2. redeploy `vesti-proxy`
3. compare same-thread downloaded artifacts:
   - `Current compact`
   - `Experimental handoff`

## Out of scope

- reopening `summary`
- wiring `E1/E2` into runtime
- multi-hop continuation
- further taxonomy expansion
- new debug UI or settings toggles
