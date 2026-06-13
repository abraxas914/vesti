import type { PlasmoCSConfig } from "plasmo";
import { sendRequest } from "../lib/messaging/runtime";
import { getCapsuleSettingsForHost } from "../lib/services/capsuleSettingsService";
import {
  getPromptAssistSettingsForHost,
  subscribePromptAssistSettings,
  updatePromptAssistSettings,
  type PromptAssistSettings,
} from "../lib/services/promptAssistSettingsService";
import {
  getComposerText,
  isComposerElement,
  normalizeHost,
  platformForHost,
  resolveComposer,
  setComposerText,
  type ComposerEl,
} from "../lib/contents/composerIo";
import {
  detectClarityIssues,
  generateSuggestions,
  getScoreBreakdown,
  scoreLevel,
  type ScoreLevel,
} from "../lib/promptlib";
import {
  getContentTranslations,
  onLocaleChange,
  type Translations,
} from "../lib/i18n/contentI18n";
import type { Prompt } from "../lib/types";
import { logger } from "../lib/utils/logger";

// In-page prompt assist (Shadow-DOM). Three capabilities, all opt-out-able:
//  1. Slash/quick-insert ("/v") of saved prompts.
//  2. Real-time, offline prompt SCORING + clarity checks + suggestions as you
//     type (heuristics only on the hot path — zero network/LLM per keystroke).
//  3. On-demand LLM "Optimize" (cold path) + one-click fill, with preview.
// It writes into the composer ONLY on explicit user action and NEVER submits.
// Composer selectors live in the shared composerIo module.

export const config: PlasmoCSConfig = {
  matches: [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://chat.deepseek.com/*",
    "https://www.doubao.com/*",
    "https://chat.qwen.ai/*",
    "https://www.kimi.com/*",
    "https://kimi.com/*",
    "https://kimi.moonshot.cn/*",
    "https://yuanbao.tencent.com/*",
  ],
  run_at: "document_idle",
  all_frames: false,
};

const ROOT_ID = "vesti-prompt-assist-root";
const Z_INDEX = 2147483645; // one below the capsule
const SLASH_TRIGGER = "/v";

// ---- background RPC helpers ------------------------------------------------

async function searchPrompts(query: string): Promise<Prompt[]> {
  try {
    return (await sendRequest({
      type: "SEARCH_PROMPTS",
      target: "offscreen",
      payload: { query, limit: 8 },
    })) as Prompt[];
  } catch (error) {
    logger.debug("content", "Prompt search failed", {
      error: (error as Error)?.message ?? String(error),
    });
    return [];
  }
}

async function completeDraft(
  draft: string,
  platform: ReturnType<typeof platformForHost>,
): Promise<{ completion: string; usedLlm: boolean }> {
  return (await sendRequest(
    {
      type: "COMPLETE_PROMPT",
      target: "offscreen",
      payload: { draft, platform, useLibrary: true },
    },
    120000,
  )) as { completion: string; usedLlm: boolean };
}

async function incrementUsage(id: number): Promise<void> {
  try {
    await sendRequest({
      type: "INCREMENT_PROMPT_USAGE",
      target: "offscreen",
      payload: { id },
    });
  } catch {
    // best-effort
  }
}

async function saveDraftAsPrompt(
  body: string,
  platform: ReturnType<typeof platformForHost>,
): Promise<boolean> {
  try {
    const result = (await sendRequest({
      type: "CREATE_PROMPT",
      target: "offscreen",
      payload: {
        input: { body, source: "manual", source_platform: platform ?? null },
      },
    })) as { created: boolean };
    return result.created;
  } catch (error) {
    logger.debug("content", "Save prompt failed", {
      error: (error as Error)?.message ?? String(error),
    });
    return false;
  }
}

const LEVEL_COLOR: Record<ScoreLevel, string> = {
  poor: "#dc2626",
  fair: "#d97706",
  good: "#2563eb",
  excellent: "#059669",
};

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
.launcher {
  position: fixed; left: 20px; bottom: 20px; z-index: ${Z_INDEX};
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 999px; border: none; cursor: pointer;
  background: #4f46e5; color: #fff; font-size: 13px; font-weight: 600;
  box-shadow: 0 4px 14px rgba(79,70,229,0.35);
}
.launcher:hover { background: #4338ca; }
.la-score { display:none; align-items:center; justify-content:center; min-width:22px; height:18px; padding:0 5px; border-radius:999px; background:#fff; color:#111; font-size:11px; font-weight:700; }
.launcher[data-has-score="1"] .la-score { display:inline-flex; }
.panel {
  position: fixed; left: 20px; bottom: 64px; z-index: ${Z_INDEX};
  width: 348px; max-height: 78vh; overflow-y: auto; display: flex; flex-direction: column;
  background: #fff; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}
.panel.hidden { display: none; }
.panel-head { display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.panel-title { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color:#6b7280; }
.panel-close { background:none; border:none; cursor:pointer; color:#9ca3af; font-size:16px; line-height:1; }
.quality { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.q-head { display:flex; align-items:center; justify-content:space-between; }
.q-label { font-size:12px; font-weight:700; color:#374151; }
.q-score { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; }
.q-dot { width:9px; height:9px; border-radius:50%; }
.q-bar { height:5px; border-radius:999px; background:#eee; margin-top:8px; overflow:hidden; }
.q-bar > i { display:block; height:100%; border-radius:999px; transition: width .15s ease; }
.q-issues { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:5px; }
.q-issue { display:flex; gap:7px; font-size:11.5px; color:#4b5563; line-height:1.35; }
.q-issue::before { content:"•"; color:#9ca3af; }
.q-issue[data-sev="critical"]::before { color:#dc2626; }
.q-issue[data-sev="warn"]::before { color:#d97706; }
.q-empty { font-size:11.5px; color:#9ca3af; margin-top:6px; }
.row { display:flex; gap:6px; padding: 10px 12px; }
.search { flex:1; padding: 7px 9px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; outline:none; }
.search:focus { border-color:#4f46e5; }
.btn { padding: 7px 10px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb; cursor:pointer; font-size:12px; color:#374151; white-space:nowrap; }
.btn:hover { background:#f3f4f6; }
.btn:disabled { opacity:.6; cursor:default; }
.btn-primary { background:#4f46e5; color:#fff; border-color:#4f46e5; }
.btn-primary:hover { background:#4338ca; }
.list { overflow-y:auto; padding: 4px 6px 8px; }
.item { padding: 8px 10px; border-radius:8px; cursor:pointer; }
.item:hover { background:#f5f3ff; }
.item-title { font-size:13px; font-weight:600; color:#111827; }
.item-body { font-size:11px; color:#6b7280; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.empty { padding: 16px; text-align:center; color:#9ca3af; font-size:12px; }
.preview { padding: 10px 12px; border-top:1px solid #f0f0f0; }
.preview-text { white-space:pre-wrap; font-size:12px; color:#374151; max-height: 180px; overflow-y:auto; background:#f9fafb; border-radius:8px; padding:8px; }
.preview-actions { display:flex; gap:6px; margin-top:8px; justify-content:flex-end; }
.hint { font-size:11px; color:#9ca3af; padding: 0 12px 8px; }
.foot { display:flex; gap:10px; padding: 8px 12px; border-top:1px solid #f0f0f0; }
.foot button { background:none; border:none; cursor:pointer; color:#6b7280; font-size:11px; padding:0; }
.foot button:hover { color:#4f46e5; text-decoration:underline; }
`;

interface ScoreState {
  text: string;
  score: number;
  level: ScoreLevel;
  suggestionKeys: Array<{ key: string; sev: string }>;
}

const mount = async () => {
  if (window.top !== window.self) return;
  if (document.getElementById(ROOT_ID)) return;

  const hostname = normalizeHost(window.location.hostname);
  const platform = platformForHost(window.location.hostname);

  // Reuse capsule per-host visibility so disabling Vesti on a host hides assist.
  try {
    const capsule = await getCapsuleSettingsForHost(hostname);
    if (!capsule.enabled || capsule.hiddenHosts.includes(hostname)) {
      logger.info("content", "Prompt assist hidden by settings", { host: hostname });
      return;
    }
  } catch {
    // fall through with default-on behavior
  }

  let assistSettings: PromptAssistSettings = await getPromptAssistSettingsForHost(
    hostname,
  );
  let t: Translations = await getContentTranslations();

  // ---- shadow root + UI ----------------------------------------------------
  const root = document.createElement("div");
  root.id = ROOT_ID;
  document.body.appendChild(root);
  const shadow = root.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.appendChild(style);

  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.type = "button";
  launcher.innerHTML = `<span class="la-icon">✨</span><span class="la-score"></span>`;
  shadow.appendChild(launcher);
  const launcherScore = launcher.querySelector(".la-score") as HTMLElement;

  const panel = document.createElement("div");
  panel.className = "panel hidden";
  panel.innerHTML = `
    <div class="panel-head">
      <span class="panel-title"></span>
      <button class="panel-close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="quality">
      <div class="q-head">
        <span class="q-label"></span>
        <span class="q-score"><span class="q-dot"></span><span class="q-num"></span></span>
      </div>
      <div class="q-bar"><i></i></div>
      <ul class="q-issues"></ul>
      <div class="q-empty"></div>
      <div class="row" style="padding:10px 0 0">
        <button class="btn btn-primary btn-optimize" type="button" style="flex:1"></button>
      </div>
    </div>
    <div class="row">
      <input class="search" type="text" />
    </div>
    <div class="list"></div>
    <div class="row">
      <button class="btn btn-save" type="button" style="flex:1"></button>
    </div>
    <div class="hint"></div>
    <div class="preview" style="display:none"></div>
    <div class="foot">
      <button class="foot-off" type="button"></button>
    </div>
  `;
  shadow.appendChild(panel);

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector(sel) as T;
  const titleEl = $(".panel-title");
  const qLabel = $(".q-label");
  const qDot = $(".q-dot");
  const qNum = $(".q-num");
  const qBar = $(".q-bar > i") as HTMLElement;
  const qIssues = $(".q-issues");
  const qEmpty = $(".q-empty");
  const optimizeBtn = $(".btn-optimize") as HTMLButtonElement;
  const searchInput = $(".search") as HTMLInputElement;
  const listEl = $(".list");
  const saveBtn = $(".btn-save") as HTMLButtonElement;
  const hintEl = $(".hint");
  const previewEl = $(".preview");
  const offBtn = $(".foot-off") as HTMLButtonElement;

  let panelOpen = false;
  let slashAnchor: ComposerEl | null = null;
  let scoreState: ScoreState | null = null;

  // ---- static label application (re-run on locale change) ------------------
  const applyStaticLabels = () => {
    const a = t.realTimeAssist;
    titleEl.textContent = "Vesti";
    qLabel.textContent = a.panelTitle;
    optimizeBtn.textContent = a.actions.optimize;
    searchInput.placeholder = t.realTimeAssist.empty.noScore;
    saveBtn.textContent = a.actions.saveAsPrompt;
    hintEl.textContent = `${SLASH_TRIGGER} … — ${a.toggle.label}`;
    offBtn.textContent = a.toggle.turnOffHere;
    optimizeBtn.style.display = assistSettings.optimizeWithLlm ? "" : "none";
  };

  // ---- score rendering (hot path output) -----------------------------------
  const renderScore = () => {
    const showChip = assistSettings.realtimeEnabled && !!scoreState && scoreState.text.length > 0;
    launcher.setAttribute("data-has-score", showChip ? "1" : "0");
    if (showChip && scoreState) {
      const pct = Math.round(scoreState.score * 100);
      launcherScore.textContent = String(pct);
      launcherScore.style.color = LEVEL_COLOR[scoreState.level];
    }
    if (!panelOpen) return;

    const a = t.realTimeAssist;
    if (!assistSettings.realtimeEnabled) {
      qLabel.textContent = a.panelTitle;
      qNum.textContent = "";
      qDot.style.background = "transparent";
      qBar.style.width = "0%";
      qIssues.innerHTML = "";
      qEmpty.textContent = a.toggle.disabled;
      return;
    }
    if (!scoreState || scoreState.text.length === 0) {
      qNum.textContent = "";
      qDot.style.background = "#d1d5db";
      qBar.style.width = "0%";
      qIssues.innerHTML = "";
      qEmpty.textContent = a.empty.noScore;
      return;
    }
    const color = LEVEL_COLOR[scoreState.level];
    qNum.textContent = `${a.score[scoreState.level]} · ${Math.round(scoreState.score * 100)}`;
    (qNum.parentElement as HTMLElement).style.color = color;
    qDot.style.background = color;
    qBar.style.width = `${Math.round(scoreState.score * 100)}%`;
    qBar.style.background = color;

    qIssues.innerHTML = "";
    const suggestions = scoreState.suggestionKeys;
    if (suggestions.length === 0) {
      qEmpty.textContent = a.empty.allClear;
    } else {
      qEmpty.textContent = "";
      for (const s of suggestions) {
        const li = document.createElement("li");
        li.className = "q-issue";
        li.setAttribute("data-sev", s.sev);
        li.textContent = resolveI18n(s.key);
        qIssues.appendChild(li);
      }
    }
  };

  // Resolve a dotted i18n key like "realTimeAssist.suggestion.noRole".
  const resolveI18n = (key: string): string => {
    const parts = key.split(".");
    let node: unknown = t;
    for (const part of parts) {
      if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof node === "string" ? node : key;
  };

  // ---- offline scoring (pure; safe per keystroke) --------------------------
  const computeScore = (text: string): ScoreState => {
    const breakdown = getScoreBreakdown(text);
    const issues = detectClarityIssues(text);
    const suggestions = assistSettings.showClarityBadge
      ? generateSuggestions(issues, 4)
      : [];
    return {
      text,
      score: breakdown.score,
      level: scoreLevel(breakdown.score),
      suggestionKeys: suggestions.map((s) => ({ key: s.suggestionKey, sev: s.severity })),
    };
  };

  let rafHandle: number | null = null;
  const scheduleScore = (text: string) => {
    const trimmed = text.trim();
    if (scoreState && scoreState.text === trimmed) return; // dirty-check
    if (rafHandle !== null) return;
    rafHandle = window.requestAnimationFrame(() => {
      rafHandle = null;
      scoreState = computeScore(trimmed);
      renderScore();
    });
  };

  // ---- IME-safe debounced input pipeline -----------------------------------
  let isComposing = false;
  let scoreTimer: number | null = null;
  const cancelScoreTimer = () => {
    if (scoreTimer !== null) {
      window.clearTimeout(scoreTimer);
      scoreTimer = null;
    }
  };

  const onComposerInput = (target: ComposerEl) => {
    const text = getComposerText(target);

    // (1) slash trigger — independent of the real-time toggle.
    const trimmedStart = text.trimStart();
    const match = trimmedStart.match(/^\/v\s?(.*)$/s);
    if (match) {
      slashAnchor = target;
      const query = (match[1] ?? "").split("\n")[0] ?? "";
      searchInput.value = query;
      if (!panelOpen) setPanel(true);
      else void renderResults(query);
    } else if (slashAnchor && panelOpen) {
      slashAnchor = null;
    }

    // (2) real-time scoring — debounced, never during IME composition.
    if (!assistSettings.realtimeEnabled) return;
    cancelScoreTimer();
    if (isComposing) return;
    scoreTimer = window.setTimeout(() => {
      scoreTimer = null;
      scheduleScore(text);
    }, assistSettings.debounceMs);
  };

  document.addEventListener(
    "compositionstart",
    () => {
      isComposing = true;
      cancelScoreTimer();
    },
    true,
  );
  document.addEventListener(
    "compositionend",
    (event) => {
      isComposing = false;
      const target = event.target;
      if (isComposerElement(target) && assistSettings.realtimeEnabled) {
        cancelScoreTimer();
        scoreTimer = window.setTimeout(() => {
          scoreTimer = null;
          scheduleScore(getComposerText(target));
        }, assistSettings.debounceMs);
      }
    },
    true,
  );
  document.addEventListener(
    "input",
    (event) => {
      const target = event.target;
      if (!isComposerElement(target)) return;
      onComposerInput(target);
    },
    true,
  );

  // ---- panel + library -----------------------------------------------------
  const setPanel = (open: boolean) => {
    panelOpen = open;
    panel.classList.toggle("hidden", !open);
    if (open) {
      // Refresh score from the live composer when opening.
      const composer = resolveComposer(window.location.hostname);
      if (composer && assistSettings.realtimeEnabled) {
        scoreState = computeScore(getComposerText(composer));
      }
      renderScore();
      void renderResults(searchInput.value);
    } else {
      slashAnchor = null;
      previewEl.style.display = "none";
    }
  };

  const insertPrompt = async (prompt: Prompt) => {
    const composer = slashAnchor ?? resolveComposer(window.location.hostname);
    if (!composer) {
      logger.info("content", "Prompt assist: composer not found");
      return;
    }
    if (slashAnchor) {
      setComposerText(composer, prompt.body);
    } else {
      const existing = getComposerText(composer).trim();
      setComposerText(composer, existing ? `${existing}\n${prompt.body}` : prompt.body);
    }
    void incrementUsage(prompt.id);
    setPanel(false);
  };

  const renderResults = async (query: string) => {
    const prompts = await searchPrompts(query);
    listEl.innerHTML = "";
    if (prompts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "—";
      listEl.appendChild(empty);
      return;
    }
    for (const prompt of prompts) {
      const item = document.createElement("div");
      item.className = "item";
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = prompt.title;
      const body = document.createElement("div");
      body.className = "item-body";
      body.textContent = prompt.body;
      item.append(title, body);
      item.addEventListener("click", () => void insertPrompt(prompt));
      listEl.appendChild(item);
    }
  };

  const showPreview = (completion: string, usedLlm: boolean) => {
    const a = t.realTimeAssist;
    previewEl.style.display = "block";
    previewEl.innerHTML = `
      <div class="preview-text"></div>
      <div class="preview-actions">
        <button class="btn btn-cancel" type="button"></button>
        <button class="btn btn-primary btn-replace" type="button"></button>
      </div>
    `;
    (previewEl.querySelector(".preview-text") as HTMLElement).textContent = completion;
    const replaceBtn = previewEl.querySelector(".btn-replace") as HTMLButtonElement;
    const cancelBtn = previewEl.querySelector(".btn-cancel") as HTMLButtonElement;
    cancelBtn.textContent = a.actions.cancel;
    replaceBtn.textContent = usedLlm ? a.actions.replaceDraft : a.actions.useSuggestion;
    replaceBtn.addEventListener("click", () => {
      const composer = resolveComposer(window.location.hostname);
      if (composer) setComposerText(composer, completion);
      previewEl.style.display = "none";
      setPanel(false);
    });
    cancelBtn.addEventListener("click", () => {
      previewEl.style.display = "none";
    });
  };

  // ---- actions -------------------------------------------------------------
  launcher.addEventListener("click", () => setPanel(!panelOpen));
  $(".panel-close").addEventListener("click", () => setPanel(false));

  let searchDebounce: number | null = null;
  searchInput.addEventListener("input", () => {
    if (searchDebounce) window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => void renderResults(searchInput.value), 180);
  });

  optimizeBtn.addEventListener("click", async () => {
    const a = t.realTimeAssist;
    const composer = resolveComposer(window.location.hostname);
    const draft = composer ? getComposerText(composer).trim() : "";
    if (!draft) {
      previewEl.style.display = "block";
      previewEl.innerHTML = `<div class="empty">${a.empty.noScore}</div>`;
      return;
    }
    optimizeBtn.disabled = true;
    optimizeBtn.textContent = a.actions.optimizing;
    try {
      const result = await completeDraft(draft, platform);
      if (!result.usedLlm && result.completion.trim() === draft) {
        previewEl.style.display = "block";
        previewEl.innerHTML = `<div class="empty">${a.actions.offlineHint}</div>`;
      } else {
        showPreview(result.completion, result.usedLlm);
      }
    } catch {
      previewEl.style.display = "block";
      previewEl.innerHTML = `<div class="empty">${a.actions.completionFailed}</div>`;
    } finally {
      optimizeBtn.disabled = false;
      optimizeBtn.textContent = a.actions.optimize;
    }
  });

  saveBtn.addEventListener("click", async () => {
    const composer = resolveComposer(window.location.hostname);
    const draft = composer ? getComposerText(composer).trim() : "";
    if (!draft) return;
    const created = await saveDraftAsPrompt(draft, platform);
    const original = t.realTimeAssist.actions.saveAsPrompt;
    saveBtn.textContent = created ? "✓" : "•";
    window.setTimeout(() => {
      saveBtn.textContent = original;
    }, 1600);
  });

  offBtn.addEventListener("click", async () => {
    await updatePromptAssistSettings(hostname, { realtimeEnabled: false });
    // settings subscription will apply the change + re-render.
  });

  document.addEventListener("click", (event) => {
    if (!panelOpen) return;
    const path = event.composedPath();
    if (!path.includes(root)) setPanel(false);
  });

  // ---- live settings + locale subscriptions --------------------------------
  const unsubscribeSettings = subscribePromptAssistSettings(hostname, (next) => {
    assistSettings = next;
    applyStaticLabels();
    if (!next.realtimeEnabled) {
      scoreState = null;
    }
    renderScore();
  });

  const unsubscribeLocale = onLocaleChange((next) => {
    t = next;
    applyStaticLabels();
    renderScore();
  });

  window.addEventListener("pagehide", () => {
    unsubscribeSettings();
    unsubscribeLocale();
  });

  applyStaticLabels();
  renderScore();
  logger.info("content", "Prompt assist mounted", {
    host: hostname,
    platform,
    realtime: assistSettings.realtimeEnabled,
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void mount());
} else {
  void mount();
}
