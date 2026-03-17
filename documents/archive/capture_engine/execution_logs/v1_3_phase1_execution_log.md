# Vesti v1.3 Phase1 Execution Log

Date: 2026-02-16  
Scope: Gemini + DeepSeek capture integration and RC stabilization pass

---

## 1. Execution Scope

- Baseline: v1.2 Step1-Step4 completed.
- This run executed only v1.3 Phase1:
  - Gemini + DeepSeek parser/content integration
  - manual archive reachability for new hosts
  - strict ID behavior kept unchanged
- Out of scope:
  - Doubao/Qwen (Phase2)
  - floating archive UI
  - capture-transient persistence beyond page memory

---

## 2. Implemented Changes

### 2.1 Host and content entry expansion

- Updated host permissions:
  - `frontend/package.json`
    - added `https://gemini.google.com/*`
    - added `https://chat.deepseek.com/*`
- Expanded capsule host matches:
  - `frontend/src/contents/capsule-ui.tsx`
- Added content scripts:
  - `frontend/src/contents/gemini.ts`
  - `frontend/src/contents/deepseek.ts`
- New content scripts include:
  - observer + pipeline wiring
  - transient snapshot maintenance
  - `GET_TRANSIENT_CAPTURE_STATUS` handling
  - `FORCE_ARCHIVE_TRANSIENT` handling

### 2.2 Parser implementation (formal template)

- Added parsers:
  - `frontend/src/lib/core/parser/gemini/GeminiParser.ts`
  - `frontend/src/lib/core/parser/deepseek/DeepSeekParser.ts`
- Both parsers implement:
  - selector strategy + anchor fallback strategy
  - noise filtering and role inference from multi-source hints
  - near-duplicate suppression for stream/update chatter
  - parse stats logging:
    - `source`
    - `totalCandidates`
    - `keptMessages`
    - `roleDistribution`
    - `droppedNoise`
    - `droppedUnknownRole`
    - `durationMs`
  - strict session ID extraction from URL/query
  - `getSourceCreatedAt()` best-effort via `time[datetime]`

### 2.3 Manual archive path expansion

- Updated background platform routing:
  - `frontend/src/background/index.ts`
  - added Gemini/DeepSeek to supported capture hosts
  - extended URL-to-platform resolution for both hosts
- Updated Settings platform hint copy:
  - `frontend/src/sidepanel/pages/SettingsPage.tsx`
  - unsupported-tab guidance now names four platforms

### 2.4 Stability observability hardening

- Capture decision logging now includes platform/session context:
  - `frontend/src/lib/capture/storage-interceptor.ts`
- Capture pipeline result log now includes:
  - `platform`
  - `sessionUUID`
  - `mode`
  - `decision`
  - `reason`
  - `messageCount`
  - `turnCount`
  - file: `frontend/src/lib/core/pipeline/capturePipeline.ts`

### 2.5 Post-Phase1 hotfix (title + turn semantics)

- Gemini title extraction corrected:
  - heading-first (`[role='heading']`)
  - title-only cleanup of `You said` prefix
  - generic heading blacklist fallback to first user message
- Turn semantics hardened across capture and UI:
  - added `turn_count` in conversation model (AI replies count)
  - Smart `minTurns` now evaluates AI replies (not `floor(messages/2)`)
  - sidepanel counters normalized to `messages · turns`
  - active capture snapshot now labels turns as AI replies
- Dexie upgraded to version 4:
  - backfills historical `turn_count` by scanning existing messages (`role === "ai"`)

### 2.6 DeepSeek DOM adaptation hotfix

- DeepSeek parser updated for non-`main` page topology and `.ds-message` message nodes.
- Role anchors/turn blocks now include DeepSeek-specific selectors.
- Added hybrid role inference:
  - class-based user detection (`user/human/query/prompt` + temporary hash fallback)
  - default `.ds-message` without user markers treated as AI
- Session path extraction now explicitly covers `/a/chat/s/<id>`.
- Added zero-message parser warning payload to speed up diagnosis when DOM shifts.

---

## 3. Strict-ID Policy Alignment

- Kept strict identity baseline from v1.2 Step3:
  - missing stable conversation ID => `held/missing_conversation_id`
  - no synthetic/temporary UUID fallback added
  - force archive does not bypass missing-ID guard

---

## 4. Build and Packaging Verification

- Command: `pnpm -C frontend build`  
  Result: passed
- Command: `pnpm -C frontend package`  
  Result: passed

---

## 5. RC Readiness Notes

- Phase1 code path is integrated for Gemini and DeepSeek.
- Remaining release gate work is manual sampling + evidence capture per:
  - `documents/capture_engine/manual_sampling_and_acceptance.md`
  - `documents/capture_engine/capture_debugging_playbook.md`
