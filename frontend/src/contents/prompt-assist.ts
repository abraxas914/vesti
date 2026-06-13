import type { PlasmoCSConfig } from "plasmo";
import { sendRequest } from "../lib/messaging/runtime";
import { getCapsuleSettingsForHost } from "../lib/services/capsuleSettingsService";
import type { Platform, Prompt } from "../lib/types";
import { logger } from "../lib/utils/logger";

// In-page prompt assist: a Shadow-DOM launcher offering (1) slash/quick-insert
// of saved prompts and (2) LLM "补写" (smart completion) of the current draft.
// It only ever writes into the composer on explicit user action and never
// auto-submits. Per-platform composer selectors will need maintenance like the
// capture parsers.

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

const normalizeHost = (host: string): string =>
  host.startsWith("www.") ? host.slice(4) : host;

const PLATFORM_BY_HOST: Record<string, Platform> = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "claude.ai": "Claude",
  "gemini.google.com": "Gemini",
  "chat.deepseek.com": "DeepSeek",
  "chat.qwen.ai": "Qwen",
  "doubao.com": "Doubao",
  "kimi.com": "Kimi",
  "kimi.moonshot.cn": "Kimi",
  "yuanbao.tencent.com": "Yuanbao",
};

// Per-host composer hints, tried in order. A generic fallback handles drift.
const COMPOSER_SELECTORS: Record<string, string[]> = {
  "chatgpt.com": ["#prompt-textarea", "div[contenteditable='true']#prompt-textarea", "textarea"],
  "chat.openai.com": ["#prompt-textarea", "textarea"],
  "claude.ai": ["div[contenteditable='true'].ProseMirror", "div[contenteditable='true']"],
  "gemini.google.com": ["div.ql-editor[contenteditable='true']", "rich-textarea div[contenteditable='true']"],
  "chat.deepseek.com": ["#chat-input", "textarea#chat-input", "textarea"],
  "doubao.com": ["textarea", "div[contenteditable='true']"],
  "chat.qwen.ai": ["textarea", "div[contenteditable='true']"],
  "kimi.com": [".chat-input-editor", "div[contenteditable='true']", "textarea"],
  "kimi.moonshot.cn": [".chat-input-editor", "div[contenteditable='true']", "textarea"],
  "yuanbao.tencent.com": [".ql-editor[contenteditable='true']", "div[contenteditable='true']", "textarea"],
};

const GENERIC_COMPOSER_SELECTORS = [
  "div[contenteditable='true']",
  "textarea",
];

type ComposerEl = HTMLTextAreaElement | HTMLElement;

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 12) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** Resolve the active composer, preferring per-host hints, then a heuristic. */
function resolveComposer(host: string): ComposerEl | null {
  const active = document.activeElement;
  if (
    active &&
    (active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable))
  ) {
    return active as ComposerEl;
  }

  const hints = COMPOSER_SELECTORS[host] ?? [];
  for (const selector of [...hints, ...GENERIC_COMPOSER_SELECTORS]) {
    const candidates = Array.from(document.querySelectorAll(selector)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && isVisible(el),
    );
    // Prefer the lowest visible editable (composers sit at the bottom).
    candidates.sort(
      (a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top,
    );
    if (candidates[0]) return candidates[0];
  }
  return null;
}

function getComposerText(el: ComposerEl): string {
  if (el instanceof HTMLTextAreaElement) return el.value;
  return el.innerText;
}

/** Write text into a composer in a way React/ProseMirror editors register. */
function setComposerText(el: ComposerEl, text: string): void {
  el.focus();

  if (el instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  // contenteditable: select all then insert so frameworks see a real edit.
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection?.removeAllRanges();
  selection?.addRange(range);
  // execCommand is deprecated but remains the most reliable cross-editor path.
  const inserted = document.execCommand("insertText", false, text);
  if (!inserted) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
}

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
  platform: Platform | undefined,
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

async function saveDraftAsPrompt(body: string, platform: Platform | undefined): Promise<boolean> {
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
.panel {
  position: fixed; left: 20px; bottom: 64px; z-index: ${Z_INDEX};
  width: 340px; max-height: 70vh; overflow: hidden; display: flex; flex-direction: column;
  background: #fff; color: #1f2937; border: 1px solid #e5e7eb; border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}
.panel.hidden { display: none; }
.panel-head { display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
.panel-title { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color:#6b7280; }
.panel-close { background:none; border:none; cursor:pointer; color:#9ca3af; font-size:16px; line-height:1; }
.row { display:flex; gap:6px; padding: 10px 12px; }
.search { flex:1; padding: 7px 9px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; outline:none; }
.search:focus { border-color:#4f46e5; }
.btn { padding: 7px 10px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb; cursor:pointer; font-size:12px; color:#374151; white-space:nowrap; }
.btn:hover { background:#f3f4f6; }
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
.hint { font-size:11px; color:#9ca3af; padding: 0 12px 10px; }
`;

const mount = async () => {
  if (window.top !== window.self) return;
  if (document.getElementById(ROOT_ID)) return;

  const hostname = normalizeHost(window.location.hostname);
  const platform = PLATFORM_BY_HOST[hostname];

  // Reuse capsule per-host visibility so disabling Vesti on a host also hides
  // the assist.
  try {
    const settings = await getCapsuleSettingsForHost(hostname);
    if (!settings.enabled || settings.hiddenHosts.includes(hostname)) {
      logger.info("content", "Prompt assist hidden by settings", { host: hostname });
      return;
    }
  } catch {
    // fall through with default-on behavior
  }

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
  launcher.innerHTML = "✨ Prompt";
  launcher.title = "Vesti prompt assist — insert saved prompts or improve your draft";
  shadow.appendChild(launcher);

  const panel = document.createElement("div");
  panel.className = "panel hidden";
  panel.innerHTML = `
    <div class="panel-head">
      <span class="panel-title">Vesti Prompts</span>
      <button class="panel-close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="row">
      <input class="search" type="text" placeholder="Search your prompt library…" />
    </div>
    <div class="list"></div>
    <div class="row">
      <button class="btn btn-improve" type="button" style="flex:1">✨ Improve my draft</button>
      <button class="btn btn-save" type="button">Save draft</button>
    </div>
    <div class="hint">Tip: type "${SLASH_TRIGGER} keyword" in the chat box to insert a saved prompt.</div>
    <div class="preview" style="display:none"></div>
  `;
  shadow.appendChild(panel);

  const searchInput = panel.querySelector(".search") as HTMLInputElement;
  const listEl = panel.querySelector(".list") as HTMLElement;
  const previewEl = panel.querySelector(".preview") as HTMLElement;
  const improveBtn = panel.querySelector(".btn-improve") as HTMLButtonElement;
  const saveBtn = panel.querySelector(".btn-save") as HTMLButtonElement;
  const closeBtn = panel.querySelector(".panel-close") as HTMLButtonElement;

  let panelOpen = false;
  let slashAnchor: ComposerEl | null = null; // set when opened via slash trigger

  const setPanel = (open: boolean) => {
    panelOpen = open;
    panel.classList.toggle("hidden", !open);
    if (open) {
      searchInput.focus();
      void renderResults(searchInput.value);
    } else {
      slashAnchor = null;
      previewEl.style.display = "none";
    }
  };

  const insertPrompt = async (prompt: Prompt) => {
    const composer = slashAnchor ?? resolveComposer(hostname);
    if (!composer) {
      logger.info("content", "Prompt assist: composer not found");
      return;
    }
    // From slash mode, replace the whole draft (it was just the trigger);
    // otherwise append to whatever the user already has.
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
      empty.textContent = query.trim()
        ? "No matching prompts."
        : "Your library is empty. Save prompts from the dashboard.";
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
    previewEl.style.display = "block";
    previewEl.innerHTML = `
      <div class="preview-text"></div>
      <div class="preview-actions">
        <button class="btn btn-cancel" type="button">Cancel</button>
        <button class="btn btn-primary btn-replace" type="button">Replace draft</button>
      </div>
    `;
    (previewEl.querySelector(".preview-text") as HTMLElement).textContent = completion;
    const replaceBtn = previewEl.querySelector(".btn-replace") as HTMLButtonElement;
    const cancelBtn = previewEl.querySelector(".btn-cancel") as HTMLButtonElement;
    if (!usedLlm) {
      replaceBtn.textContent = "Use suggestion";
    }
    replaceBtn.addEventListener("click", () => {
      const composer = resolveComposer(hostname);
      if (composer) setComposerText(composer, completion);
      previewEl.style.display = "none";
      setPanel(false);
    });
    cancelBtn.addEventListener("click", () => {
      previewEl.style.display = "none";
    });
  };

  // --- wiring ---------------------------------------------------------------

  launcher.addEventListener("click", () => setPanel(!panelOpen));
  closeBtn.addEventListener("click", () => setPanel(false));

  let searchDebounce: number | null = null;
  searchInput.addEventListener("input", () => {
    if (searchDebounce) window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => void renderResults(searchInput.value), 180);
  });

  improveBtn.addEventListener("click", async () => {
    const composer = resolveComposer(hostname);
    const draft = composer ? getComposerText(composer).trim() : "";
    if (!draft) {
      previewEl.style.display = "block";
      previewEl.innerHTML = `<div class="empty">Type a draft in the chat box first.</div>`;
      return;
    }
    improveBtn.disabled = true;
    improveBtn.textContent = "✨ Improving…";
    try {
      const result = await completeDraft(draft, platform);
      showPreview(result.completion, result.usedLlm);
    } catch (error) {
      previewEl.style.display = "block";
      previewEl.innerHTML = `<div class="empty">Completion failed: ${
        (error as Error)?.message ?? "unknown error"
      }</div>`;
    } finally {
      improveBtn.disabled = false;
      improveBtn.textContent = "✨ Improve my draft";
    }
  });

  saveBtn.addEventListener("click", async () => {
    const composer = resolveComposer(hostname);
    const draft = composer ? getComposerText(composer).trim() : "";
    if (!draft) return;
    const created = await saveDraftAsPrompt(draft, platform);
    saveBtn.textContent = created ? "Saved ✓" : "Already saved";
    window.setTimeout(() => {
      saveBtn.textContent = "Save draft";
    }, 1800);
  });

  // Slash trigger: when the composer text begins with the trigger, open the
  // panel pre-seeded with the query after it.
  document.addEventListener(
    "input",
    (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      const text = getComposerText(target as ComposerEl).trimStart();
      const match = text.match(/^\/v\s?(.*)$/s);
      if (!match) {
        if (slashAnchor && panelOpen) {
          // user cleared the trigger; detach slash anchor
          slashAnchor = null;
        }
        return;
      }
      slashAnchor = target as ComposerEl;
      const query = (match[1] ?? "").split("\n")[0] ?? "";
      searchInput.value = query;
      if (!panelOpen) setPanel(true);
      else void renderResults(query);
    },
    true,
  );

  // Dismiss panel on outside click.
  document.addEventListener("click", (event) => {
    if (!panelOpen) return;
    const path = event.composedPath();
    if (!path.includes(root)) setPanel(false);
  });

  logger.info("content", "Prompt assist mounted", { host: hostname, platform });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void mount());
} else {
  void mount();
}
