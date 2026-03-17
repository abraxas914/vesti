# Vesti v1.3 Phase1 Manual Sampling Checklist (Gemini + DeepSeek)

Date: 2026-02-16  
Owner: QA + Engineering  
Scope: Phase1 only (Gemini, DeepSeek) + ChatGPT/Claude regression sanity

---

## 1. Exit Criteria

- Minimum cases completed:
  - Phase1: `2 platforms x 3 modes x 2 scenarios = 12`
  - Regression sanity: `4`
  - Total minimum: `16`
- Go threshold:
  - `Blocker = 0`
  - `Major <= 2` (each Major has owner + workaround + re-test plan)
- Turn metric contract:
  - `turns` = AI replies count (not `floor(messages/2)`)

---

## 2. Preflight Checklist (before test run)

- [ ] Extension build is latest local RC branch.
- [ ] `pnpm -C frontend build` passes.
- [ ] `pnpm -C frontend package` passes.
- [ ] Browser cache disabled for test tab (DevTools open, optional).
- [ ] Existing test DB snapshot exported (baseline backup).
- [ ] Capture mode defaults validated in Settings.

Environment fields to record for every case:
- Build commit SHA
- Browser version
- Test URL host
- Local timestamp

---

## 3. Case Matrix (Phase1 mandatory)

## 3.1 Gemini (6)

1. `V13P1-GEMINI-MIRROR-01`  
   - Mode: mirror  
   - Scenario: standard U-A-U-A flow  
   - Expected: committed (`mode_mirror`)

2. `V13P1-GEMINI-MIRROR-02`  
   - Mode: mirror  
   - Scenario: edge streaming long answer (multiple DOM updates)  
   - Expected: no duplicate write amplification

3. `V13P1-GEMINI-SMART-01`  
   - Mode: smart (`minTurns=3`, no blacklist)  
   - Scenario: below threshold then reach threshold  
   - Expected: held (`smart_below_min_turns`) then committed (`smart_pass`)

4. `V13P1-GEMINI-SMART-02`  
   - Mode: smart (`blacklistKeywords` includes one injected token)  
   - Scenario: keyword hit  
   - Expected: held (`smart_keyword_blocked`)

5. `V13P1-GEMINI-MANUAL-01`  
   - Mode: manual  
   - Scenario: normal conversation + archive button  
   - Expected: auto held (`mode_manual_hold`), force committed (`force_archive`)

6. `V13P1-GEMINI-MANUAL-02`  
   - Mode: manual  
   - Scenario: no stable ID URL stage  
   - Expected: force still held (`missing_conversation_id`)

## 3.2 DeepSeek (6)

7. `V13P1-DEEPSEEK-MIRROR-01`  
   - Mode: mirror  
   - Scenario: standard U-A-U-A flow (`.ds-message` structure, no `<main>`)  
   - Expected: committed (`mode_mirror`)

8. `V13P1-DEEPSEEK-MIRROR-02`  
   - Mode: mirror  
   - Scenario: edge streaming long answer  
   - Expected: no duplicate write amplification

9. `V13P1-DEEPSEEK-SMART-01`  
   - Mode: smart (`minTurns=3`)  
   - Scenario: threshold crossing  
   - Expected: held then committed

10. `V13P1-DEEPSEEK-SMART-02`  
    - Mode: smart with blacklist  
    - Scenario: keyword hit / remove keyword and retry  
    - Expected: held on hit, committed after clean payload

11. `V13P1-DEEPSEEK-MANUAL-01`  
    - Mode: manual  
    - Scenario: normal conversation + archive button  
    - Expected: auto held, force committed

12. `V13P1-DEEPSEEK-MANUAL-02`  
    - Mode: manual  
    - Scenario: transient missing after tab refresh  
    - Expected: `TRANSIENT_NOT_FOUND`

---

## 4. Regression Sanity (ChatGPT + Claude, mandatory 4)

13. `V13P1-CHATGPT-MIRROR-R01`  
    - Expected: mirror still committed, timeline updates

14. `V13P1-CHATGPT-MANUAL-R02`  
    - Expected: auto held + force archive success

15. `V13P1-CLAUDE-SMART-R03`  
    - Expected: smart threshold behavior unchanged

16. `V13P1-CLAUDE-MANUAL-R04`  
    - Expected: auto held + force archive success (when ID stable)

---

## 5. Per-Case Evidence Checklist (DoD)

For each case, all items are required:

- [ ] Case metadata
  - [ ] Case ID
  - [ ] Platform
  - [ ] Mode
  - [ ] Input conditions
  - [ ] Expected
  - [ ] Actual
  - [ ] Verdict (Pass/Fail)
  - [ ] Tester
  - [ ] Timestamp
- [ ] Parser stats snippet
- [ ] Capture decision log snippet
- [ ] IndexedDB before/after count snapshot
- [ ] At least one timestamp-visible screenshot

Any missing evidence = invalid case.

---

## 6. Recommended Execution Order

1. Run Gemini 6 cases
2. Run DeepSeek 6 cases
3. Run ChatGPT/Claude 4 regression cases
4. Consolidate defects and severity tags
5. Re-test failed cases + minimal regression set

---

## 7. Defect Severity Rules

- Blocker:
  - data loss
  - force archive chain broken
  - wrong mode logic in core path
- Major:
  - incorrect decision in edge path
  - parser role classification unstable in normal flow
- Minor:
  - UI text/status mismatch without data correctness impact

---

## 8. Result Summary Template

```md
# v1.3 Phase1 Sampling Result

- Total planned: 16
- Total executed: <n>
- Passed: <n>
- Failed: <n>

## Severity
- Blocker: <n>
- Major: <n>
- Minor: <n>

## Go/No-Go
- Decision: Go | No-Go
- Reason:
- Remaining risks:
- Owner sign-off:
```

---

## 9. Storage Path Convention

Recommended evidence path:

- `qa_samples/v1.3_phase1/<case-id>/summary.md`
- `qa_samples/v1.3_phase1/<case-id>/parser.log.txt`
- `qa_samples/v1.3_phase1/<case-id>/capture.log.txt`
- `qa_samples/v1.3_phase1/<case-id>/db_before.json`
- `qa_samples/v1.3_phase1/<case-id>/db_after.json`
- `qa_samples/v1.3_phase1/<case-id>/screen_01.png`
