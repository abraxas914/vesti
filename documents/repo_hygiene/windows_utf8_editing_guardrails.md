# Windows UTF-8 Editing Guardrails

Status: Active canonical guardrail
Audience: Maintainers, automation authors, doc editors

## Purpose

This document defines the minimum safety rules for editing tracked non-ASCII documents in this repository.

It exists because Windows PowerShell 5.1 can mis-decode UTF-8 files without BOM, especially when the file contains Chinese text. If that mis-decoded string is written back to disk, the repository content itself becomes corrupted.

## Risk Model

Treat a tracked text file as encoding-sensitive when all three conditions hold:

1. the file contains non-ASCII text
2. the file is being handled through Windows PowerShell 5.1 string I/O
3. the edit path depends on shell-decoded text instead of patch-based or blob-based operations

This repo has multiple public-facing files that match that profile:

- root `README.md`
- `documents/**/*.md`
- policy and governance docs with mixed Chinese/English text

## Hard Rules

### 1. Do not trust WinPS 5.1 string decoding for tracked non-ASCII docs

The following commands are unsafe as a default read-then-write path:

- `Get-Content`
- `Set-Content`
- `Out-File`
- `Add-Content`
- `[System.IO.File]::ReadAllText(...)`
- `[System.IO.File]::WriteAllText(...)`

They may still appear in diagnostics, but they must not become the primary rewrite path for tracked non-ASCII docs unless encoding is explicit and independently verified.

### 2. Mojibake is a hard-stop signal

If a tracked file shows garbled CJK text, inconsistent decoding across tools, or obvious mojibake:

- stop the current edit path
- do not write the text back through the same shell path
- switch to patch-based or blob-based recovery

### 3. `apply_patch` is the default edit path

For tracked encoding-sensitive docs, the preferred edit order is:

1. `apply_patch`
2. git/blob-based reconstruction
3. explicit UTF-8-safe tooling with verification

Do not jump directly from `apply_patch` failure to shell string rewrites.

## Safe Fallback Order

When a normal patch fails:

1. reduce the patch scope and retry
2. recover the target text from a known-good git blob or commit
3. use explicit UTF-8-safe tooling only if the content can be validated after write

If the operation still cannot be made safe, stop and split the task instead of forcing a full-file rewrite.

## Verification Requirements

Before committing a public-doc rewrite that touches non-ASCII tracked files:

- run `git diff --check`
- verify the file through a trusted path, not only through `Get-Content`
- when recovering from an incident, compare the resulting blob against a known-good blob or commit
- keep the PR narrowly scoped if the files are high-risk public entrypoints

## Incident Recovery Rule

If a public tracked document has already been corrupted:

1. stop all further pointer or wording cleanup on that branch
2. recover the corrupted file from the last known-good blob or commit
3. open a dedicated hotfix PR for readability restoration
4. only re-land governance or pointer cleanup after the encoding path has been fixed

## Current Repository Policy

This guardrail is enforced through two layers:

- repository-local `AGENTS.md`
- `documents/repo_hygiene/` canonical documentation

If future automation needs a stronger procedural path, add a dedicated local skill instead of weakening these rules.
