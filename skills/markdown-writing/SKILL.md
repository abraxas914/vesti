---
name: vesti-markdown-writing
description: README/Markdown formatting and encoding SOP. Use for README/docs restructuring while preserving original text and writing UTF-8 BOM output for Windows compatibility.
---

# Vesti Markdown Writing Skill

## Scope

Use this skill for README/docs layout updates when content must stay semantically unchanged and only structure/presentation can be adjusted.

## Relationship With agent.md

- `agent.md` is the constitutional layer (stable architecture and quality boundaries).
- This skill is a procedural layer for Markdown/README execution details.
- If any instruction conflicts, follow `agent.md`.

## Do

- Preserve original wording; do not rewrite or summarize user-provided body text unless explicitly asked.
- Preserve paragraph breaks and blank lines.
- Use emoji-decorated H2 and simple H3 headings when requested.
- Use `style=flat-square` for badges with user-specified colors.
- Use HTML table for Tech Stack sections when requested.
- Save Chinese-facing docs as UTF-8 BOM.

## Don't

- Do not collapse paragraphs into one block.
- Do not silently change wording, tone, or meaning.
- Do not switch to default bright badge colors if a palette is specified.
- Do not replace required HTML tables with unordered lists.

## Procedure

1. Lock source copy from the user and keep it intact.
2. Apply only structural formatting (headings, spacing, tables, callouts, image blocks).
3. Save files with UTF-8 BOM when Chinese content/Windows compatibility matters.
4. Validate rendering and confirm no `???` artifacts.

## Validation Checklist

- Layout is readable and section hierarchy is clear.
- Windows editors display Chinese text correctly (no `???`).
- Badge styles and colors match the requested spec.
- Required HTML table sections are present.
