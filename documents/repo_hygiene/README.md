# Repo Hygiene Documentation Package

Status: Active canonical documentation tree for repo-local documentation safety and edit hygiene
Audience: Maintainers, automation authors, reviewers

## Purpose

`documents/repo_hygiene/` is the canonical home for repository-local document safety rules.

This directory owns:

- encoding-sensitive document editing guardrails
- automation safety rules for tracked text files
- incident-prevention guidance for public documentation rewrites
- repo-level doc hygiene practices that do not belong to a product subsystem

## This directory does not replace

- `documents/version_control_plan.md`
  - release/version governance
- `documents/ui_runtime/`
  - runtime rendering governance
- `documents/refactor_tasks/`
  - implementation task sequencing

## Files

- `windows_utf8_editing_guardrails.md`
  - canonical guardrail for Windows PowerShell 5.1, UTF-8, and tracked non-ASCII document edits

## Recommended Reading Order

1. `windows_utf8_editing_guardrails.md`
2. repository-local `AGENTS.md`

