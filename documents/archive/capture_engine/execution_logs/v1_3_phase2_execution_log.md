# Vesti v1.3 Phase2 Execution Log (Doubao + Qwen)

Date: 2026-02-16  
Owner: Engineering  
Status: RC candidate

---

## 1. Baseline

- Base line: v1.2 capture governance + v1.3 Phase1 (Gemini/DeepSeek).
- Strict identity policy retained:
  - no stable session ID => `held/missing_conversation_id`
  - force archive does not bypass missing ID.

---

## 2. Implemented in Phase2

1. Platform scope
   - Added Doubao + Qwen platform support to type system and runtime host routing.
2. Capture entrypoints
   - Added `contents/doubao.ts` and `contents/qwen.ts` with observer/pipeline/transient flow.
3. Parser modules
   - Added `DoubaoParser` and `QwenParser` with:
     - selector + anchor extraction
     - role inference via attributes/testid/class fallback
     - strict session ID extraction
     - parse stats logging + single-role warnings
4. Sidepanel runtime reachability
   - `GET_ACTIVE_CAPTURE_STATUS` and `FORCE_ARCHIVE_TRANSIENT` available on Doubao/Qwen tabs.
5. Platform theme
   - Unified six platform colors:
     - ChatGPT `#10A37F`
     - Claude `#CC785C`
     - Gemini `#AD89EB`
     - DeepSeek `#0D28F3`
     - Qwen `#615CED`
     - Doubao `#1E6FFF`

---

## 3. Validation

- Build:
  - `pnpm -C frontend build` ✅
- Package:
  - `pnpm -C frontend package` ✅
- Manual QA checklist:
  - `documents/capture_engine/v1_3_phase2_manual_sampling_checklist.md`

---

## 4. Known Limits

- `source_created_at` remains best-effort and may be `null` on some pages.
- DOM selectors are resilient but still subject to upstream site UI changes.
- Strict host scope only:
  - `www.doubao.com`
  - `chat.qwen.ai`

---

## 5. Go/No-Go Gate

- Release decision is gated by manual sampling results:
  - Blocker must be `0`
  - Major must be `<= 2` with owner + workaround + re-test
