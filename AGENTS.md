# Repository Agent Guardrails

Status: Active repository-local guardrails for automated edits
Audience: Codex, maintainers, automation contributors

## Purpose

This file defines repository-local execution rules that sit below system policy and above task-specific instructions.

It exists to prevent a repeat of the 2026-03 Windows/UTF-8 document corruption incident, where a tracked markdown file was read through an unsafe decode path and then written back as garbled content.

## Windows UTF-8 Editing Guard

Treat the following files as encoding-sensitive by default when they contain non-ASCII text:

- `*.md`
- `*.txt`
- `*.json`
- `*.yml`
- `*.yaml`
- `*.ts`
- `*.tsx`
- `*.css`
- `*.html`

When the shell is Windows PowerShell 5.1, do not use shell string I/O as the default edit path for those tracked files.

## Prohibited Paths In WinPS 5.1

Do not read a tracked non-ASCII text file with one of these commands and then write the resulting string back to disk unless encoding is explicitly controlled and independently verified:

- `Get-Content`
- `Set-Content`
- `Out-File`
- `Add-Content`
- `[System.IO.File]::ReadAllText(...)`
- `[System.IO.File]::WriteAllText(...)`

This applies even if the operation looks small, such as tail replacement or section rewrite.

## Hard Stop Rule

If a tracked file shows mojibake, garbled CJK text, or conflicting decode behavior across tools:

- stop using that shell decode path immediately
- do not write the file back through the same path
- treat the file as encoding-unsafe until proven otherwise

This is not a warning-level signal. It is a hard stop.

## Required Edit Order

For tracked encoding-sensitive files, use this fallback order:

1. `apply_patch`
2. git/blob-based recovery or patch-based reconstruction
3. explicit UTF-8-safe tooling with verification

Do not skip directly from `apply_patch` failure to ad hoc shell string rewrites.

## Required Verification

Before committing a change that touches tracked non-ASCII docs:

- run `git diff --check`
- verify that the intended file still decodes consistently through a trusted path
- when recovering from an encoding incident, compare against a known-good blob or commit instead of trusting terminal rendering alone

## Public Docs Rule

When a public doc rewrite is primarily governance or pointer cleanup:

- keep the scope narrow
- avoid mixing it with unrelated structural deletions when possible
- prefer a separate docs-only PR if the file is known to be encoding-sensitive

