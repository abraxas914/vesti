# Round-3 Plan (8 items) — feat/prompt-management

Investigated via 4 parallel recon agents + 2 clarifications. Execution order favors
fast, high-confidence fixes first (unblock device testing), then the large features.

## Decisions (from user)
- **#2 persistence** = ensure upgrade-persistence (IndexedDB already survives version
  upgrades) **+ add one-click export/import backup file** (recoverable after reinstall).
  No cloud/sync.
- **#3 one-click history** = **bulk-import of HISTORICAL conversations** from each AI
  platform (pre-install conversations that real-time capture never saw).

## Phases

### Phase A — fast fixes (do first)
- **#6 extraction returns nothing**: relax `promptExtractor` thresholds
  (minScore 0.3→0.15, minLength 24→16) and raise `MIN_RESULTS` top-up so the library
  populates with the best/most-recurring user prompts. (root cause: over-aggressive
  score/length/frequency filtering → silent 0.)
- **#1 Doubao capture**: mirror the Yuanbao fix in `contents/doubao.ts` (staggered
  initial captures + one-time diagnostic) and scope `DoubaoParser.isGenerating()` to
  message containers. Selector/session validation needs the user's console diagnostic.
- **#4 prompt library**: rename the editor "Title" field → **唤醒词** (Trigger);
  confirm no favorites/收藏 control remains.

### Phase B — i18n sweep
- **#7**: wire the ~45 hardcoded strings (library-tab dialogs/aria/error fallbacks,
  explore-tab, a few sidepanel components) to existing keys, add new keys where needed.

### Phase C — persistence
- **#2**: export/import backup — extend the existing exportAllData/importAllData
  (already includes conversations/messages/notes/etc.) to also include `prompts`;
  surface a clear "Backup / Restore" in Data settings. Verify upgrade persistence.

### Phase D — dock redesign (large)
- **#5**: merge `prompt-assist` into the capsule (owl) as one toggleable
  "prompt manager" panel in the lower dock providing: optimize, 续写 (continuation),
  常用提示词 input (list + select-to-fill + 唤醒词→full text→Enter fill), smarter 唤醒.
  Remove the standalone prompt-assist root + the 消息/轮次 metric cards
  (capsule-ui.ts lines 1346–1372). One open/close toggle on the owl. Reuse composerIo +
  promptlib; single shadow root; keep IME-safe / never-auto-submit.

### Phase E — historical import (large)
- **#3**: a "import history" action that walks a platform's conversation list, opens
  each, and runs the existing parser→capture pipeline (backfill). Per-platform DOM work;
  start with a framework + 1–2 platforms, expand. Needs care (no auto-submit, rate-limit,
  progress UI). May need a follow-up on platform priority.

Each phase: typecheck + build + device-test checkpoint.
