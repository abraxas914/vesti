# Vesti Manual Sampling and Acceptance Standard (v1.2/v1.3)

Version: v1.0  
Status: Release QA standard  
Audience: QA owner, engineering owner, release manager

---

## 1. Purpose

Define repeatable manual sampling deliverables for capture features, with strict pass/fail gates.

This document is mandatory for:
- v1.2 capture governance release
- v1.3 platform expansion phase releases

---

## 2. v1.2 Mandatory Sampling Matrix

Platforms:
- ChatGPT
- Claude

Modes:
- mirror
- smart
- manual

Per platform x mode, run at least 3 cases:
- standard flow
- boundary flow
- abnormal flow

Minimum total:
- `2 platforms x 3 modes x 3 cases = 18 cases`

---

## 3. Case Design Rules

## 3.1 Standard flow

Typical U-A conversation with normal message length.

## 3.2 Boundary flow

At least one of:
- smart threshold transition (`2 turns -> 3 turns`)
- blacklist hit then un-hit
- long AI response with streaming updates

## 3.3 Abnormal flow

At least one of:
- rapid message edits/regenerates
- tab refresh during held state
- force archive with transient unavailable

---

## 4. Definition of Done per Case

Each case must include all fields below:

- `Case ID`
- `Platform`
- `Capture Mode`
- `Input Conditions`
- `Expected Result`
- `Actual Result`
- `Pass/Fail`
- `Tester`
- `Timestamp`

Required evidence attachments:
1. parser stats snippet
2. capture decision log snippet
3. IndexedDB before/after counts
4. screenshot(s) with visible timestamp

Cases missing any evidence are invalid.

---

## 5. Case ID and Artifact Naming

Case ID format:
- `V12-<PLATFORM>-<MODE>-<NN>`
- example: `V12-CLAUDE-SMART-02`

Evidence folder convention:
- `qa_samples/v1.2/<case-id>/`

Contained files:
- `summary.md`
- `parser.log.txt`
- `capture.log.txt`
- `db_snapshot_before.json`
- `db_snapshot_after.json`
- `screen_01.png` (and more if needed)

---

## 6. v1.2 Pass/Fail Scoring Model

Severity levels:
- **Blocker**: data loss, incorrect forced archive behavior, persistent incorrect mode logic
- **Major**: wrong decision in edge path, unstable parser role distribution in normal flow
- **Minor**: cosmetic/status text mismatch without behavior impact

Release threshold:
- `Blocker = 0`
- `Major <= 2` (and each Major has workaround + tracked fix plan)
- `Minor` unrestricted but must be logged

---

## 7. Replay and Regression Method

For every failed case:
1. produce exact replay steps
2. include environment details:
   - extension build hash
   - browser version
   - platform URL
3. rerun same case after fix
4. run minimal regression set:
   - ChatGPT mirror standard
   - Claude smart threshold
   - manual force archive

A fix is accepted only when original failed case + regression set both pass.

---

## 8. v1.3 Phase Sampling Standard

Each phase (2 platforms) requires minimum:
- `2 platforms x 3 modes x 2 cases = 12 cases`
  - standard + edge at minimum per mode

Phase 1:
- Gemini + DeepSeek

Phase 2:
- Doubao + Qwen

Additional mandatory regression in each phase:
- ChatGPT + Claude sanity (at least 4 cases total)

---

## 9. Go/No-Go Checklist

Release is **Go** only when all are true:
1. sampling count meets minimum.
2. all required evidence bundles are complete.
3. severity threshold is satisfied.
4. governance behavior matches v1.2 spec.
5. known issues list exists with owner and timeline.

Release is **No-Go** if any:
- missing evidence for any failed/passed case
- blocker unresolved
- force archive chain non-deterministic
- ChatGPT/Claude regression untriaged

---

## 10. Sample Report Template

```md
## Case ID
V12-CHATGPT-SMART-01

## Context
- Build: <git-short-sha>
- Browser: <version>
- URL: <masked-url>
- Time: <local time>

## Input Conditions
- Mode: smart
- minTurns: 3
- blacklistKeywords: ["test-noise"]

## Expected
- hold before threshold
- commit after threshold

## Actual
- <result>

## Evidence
- parser stats: <path or snippet>
- capture decision log: <path or snippet>
- db before/after: <path>
- screenshots: <path list>

## Verdict
- Pass / Fail
- Severity (if fail)
```

---

## 11. Roles and Sign-off

- Tester: executes cases and compiles evidence
- Engineer owner: verifies root cause/fix mapping
- Release owner: validates threshold and signs Go/No-Go

All three must sign before final release candidate tagging.

---

## 12. Cross-Document Reference

- Technical behavior baseline:
  - `documents/capture_engine/v1_2_capture_governance_spec.md`
- Multi-platform phase rules:
  - `documents/capture_engine/v1_3_platform_expansion_spec.md`
- Phase1 executable checklist:
  - `documents/capture_engine/v1_3_phase1_manual_sampling_checklist.md`
- Debug SOP:
  - `documents/capture_engine/capture_debugging_playbook.md`
