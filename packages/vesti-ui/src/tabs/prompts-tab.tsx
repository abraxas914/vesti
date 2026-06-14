"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { DashboardLabels, Prompt, StorageApi, UiThemeMode } from "../types";

interface PromptsTabProps {
  storage: StorageApi;
  themeMode?: UiThemeMode;
  isActive?: boolean;
  onOpenConversation?: (conversationId: number) => void;
  labels: DashboardLabels["prompts"];
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface EditorState {
  open: boolean;
  isNew: boolean;
  id: number | null;
  title: string;
  body: string;
  sourceConversationId: number | null;
}

const EMPTY_EDITOR: EditorState = {
  open: false,
  isNew: false,
  id: null,
  title: "",
  body: "",
  sourceConversationId: null,
};

// Lightweight prompt repository: each entry is a concise trigger (唤醒词) + the
// original prompt body. Find / new / edit / delete only — auto-built from the
// user's high-frequency prompts. No categories / tags / quality / LLM enrichment.
export function PromptsTab({
  storage,
  isActive = false,
  onOpenConversation,
  labels,
}: PromptsTabProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [extractStatus, setExtractStatus] = useState<"idle" | "running">("idle");
  const [toast, setToast] = useState<string | null>(null);

  const supportsPrompts = Boolean(storage.listPrompts);

  const load = useCallback(async () => {
    if (!storage.listPrompts) {
      setStatus("error");
      setError(labels.unavailable);
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const result = await storage.listPrompts({ includeArchived: false });
      setPrompts(result);
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError((loadError as Error)?.message ?? labels.loadFailed);
    }
  }, [storage, labels]);

  useEffect(() => {
    if (isActive && status === "idle") {
      void load();
    }
  }, [isActive, status, load]);

  // Auto-build the library from captured conversations on open, if empty or
  // stale (>1h). Runs once per mount; the manual button remains for refresh.
  const autoExtractDoneRef = useRef(false);
  useEffect(() => {
    if (!isActive || status !== "ready" || autoExtractDoneRef.current) return;
    if (!storage.extractPromptsFromLibrary) return;
    const STALE_KEY = "vesti_prompts_last_extract";
    let lastExtract = 0;
    try {
      lastExtract = Number(window.localStorage.getItem(STALE_KEY)) || 0;
    } catch {
      lastExtract = 0;
    }
    const isStale = Date.now() - lastExtract > 60 * 60 * 1000;
    if (prompts.length > 0 && !isStale) return;
    autoExtractDoneRef.current = true;
    void (async () => {
      setExtractStatus("running");
      try {
        await storage.extractPromptsFromLibrary?.({ scope: "recent" });
        try {
          window.localStorage.setItem(STALE_KEY, String(Date.now()));
        } catch {
          /* ignore storage failures */
        }
        await load();
      } catch {
        /* silent — the manual extract button remains available */
      } finally {
        setExtractStatus("idle");
      }
    })();
  }, [isActive, status, prompts.length, storage, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visiblePrompts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = needle
      ? prompts.filter(
          (p) =>
            p.title.toLowerCase().includes(needle) ||
            p.body.toLowerCase().includes(needle),
        )
      : prompts;
    return [...list].sort((a, b) => b.updated_at - a.updated_at);
  }, [prompts, search]);

  const openNew = useCallback(() => {
    setEditor({ ...EMPTY_EDITOR, open: true, isNew: true });
  }, []);

  const openEdit = useCallback((prompt: Prompt) => {
    setEditor({
      open: true,
      isNew: false,
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      sourceConversationId: prompt.source_conversation_id,
    });
  }, []);

  const closeEditor = useCallback(() => setEditor(EMPTY_EDITOR), []);

  const handleSave = useCallback(async () => {
    const body = editor.body.trim();
    if (!body) {
      setToast(labels.toastBodyEmpty);
      return;
    }
    try {
      if (editor.isNew || editor.id === null) {
        if (!storage.createPrompt) return;
        const { created } = await storage.createPrompt({
          title: editor.title.trim() || undefined,
          body,
          source: "manual",
        });
        setToast(created ? labels.toastSaved : labels.toastDuplicate);
      } else {
        if (!storage.updatePrompt) return;
        await storage.updatePrompt(editor.id, {
          title: editor.title.trim() || undefined,
          body,
        });
        setToast(labels.toastUpdated);
      }
      closeEditor();
      await load();
    } catch (saveError) {
      setToast((saveError as Error)?.message ?? labels.toastSaveFailed);
    }
  }, [editor, storage, labels, closeEditor, load]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!storage.deletePrompt) return;
      try {
        await storage.deletePrompt(id);
        if (editor.id === id) closeEditor();
        setToast(labels.toastDeleted);
        await load();
      } catch (deleteError) {
        setToast((deleteError as Error)?.message ?? labels.toastDeleteFailed);
      }
    },
    [storage, labels, editor.id, closeEditor, load],
  );

  const handleCopy = useCallback(
    async (prompt: Prompt) => {
      try {
        await navigator.clipboard.writeText(prompt.body);
        setToast(labels.toastCopied);
        if (storage.incrementPromptUsage) {
          await storage.incrementPromptUsage(prompt.id);
        }
      } catch {
        setToast(labels.toastClipboard);
      }
    },
    [storage, labels],
  );

  const handleExtract = useCallback(async () => {
    if (!storage.extractPromptsFromLibrary) return;
    setExtractStatus("running");
    try {
      const result = await storage.extractPromptsFromLibrary({ scope: "recent" });
      try {
        window.localStorage.setItem("vesti_prompts_last_extract", String(Date.now()));
      } catch {
        /* ignore */
      }
      setToast(
        labels.toastExtract
          .replace("{created}", String(result.created))
          .replace("{candidates}", String(result.candidates)),
      );
      await load();
    } catch (extractError) {
      setToast((extractError as Error)?.message ?? labels.extractFailed);
    } finally {
      setExtractStatus("idle");
    }
  }, [storage, labels, load]);

  if (!supportsPrompts) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-text-secondary">
        <p>{labels.unavailable}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
        <div>
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.26em] text-text-primary">
            {labels.title}
          </h2>
          <p className="mt-1 text-[12px] text-text-tertiary">
            {labels.summary
              .replace("{count}", String(prompts.length))
              .replace("{favorites}", String(prompts.filter((p) => p.is_favorite).length))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExtract}
            disabled={extractStatus === "running"}
            title={labels.extractTooltip}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[13px] text-text-primary transition-colors hover:bg-bg-surface-card disabled:opacity-60"
          >
            <Sparkles strokeWidth={1.7} className="h-4 w-4" />
            {extractStatus === "running" ? labels.extracting : labels.extractFromChats}
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus strokeWidth={2} className="h-4 w-4" />
            {labels.newPrompt}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border-subtle px-6 py-3">
        <div className="relative">
          <Search
            strokeWidth={1.7}
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full rounded-lg border border-border-subtle bg-bg-primary py-1.5 pl-8 pr-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-primary"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {(status === "loading" || extractStatus === "running") && prompts.length === 0 && (
          <p className="py-12 text-center text-[13px] text-text-tertiary">
            {extractStatus === "running" ? labels.extracting : labels.loading}
          </p>
        )}
        {status === "error" && (
          <div className="py-12 text-center text-[13px] text-red-600">
            {error}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-border-subtle px-3 py-1.5 text-text-primary hover:bg-bg-surface-card"
              >
                {labels.retry}
              </button>
            </div>
          </div>
        )}
        {status === "ready" && extractStatus !== "running" && visiblePrompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] text-text-secondary">
              {prompts.length === 0 ? labels.emptyNone : labels.emptyFiltered}
            </p>
            {prompts.length === 0 && (
              <p className="mt-1 max-w-sm text-[12px] text-text-tertiary">{labels.emptyHint}</p>
            )}
          </div>
        )}
        {visiblePrompts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {visiblePrompts.map((prompt) => (
              <li
                key={prompt.id}
                className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface-card p-3.5 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
                onClick={() => openEdit(prompt)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-text-primary">
                    {prompt.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-text-secondary">
                    {prompt.body}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCopy(prompt);
                    }}
                    className="rounded p-1.5 text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary"
                    aria-label={labels.copy}
                  >
                    <Copy strokeWidth={1.7} className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(prompt.id);
                    }}
                    className="rounded p-1.5 text-text-tertiary hover:bg-red-50 hover:text-red-600"
                    aria-label={labels.deleteAria}
                  >
                    <Trash2 strokeWidth={1.7} className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor drawer */}
      {editor.open && (
        <div className="absolute inset-0 z-40 flex">
          <button
            type="button"
            aria-label={labels.closeEditor}
            className="flex-1 bg-black/20"
            onClick={closeEditor}
          />
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-subtle bg-bg-primary shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <h3 className="text-[14px] font-medium text-text-primary">
                {editor.isNew ? labels.editorNew : labels.editorEdit}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded p-1 text-text-tertiary hover:bg-bg-surface-card hover:text-text-primary"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 px-5 py-4">
              <label className="text-[12px] font-medium text-text-secondary">
                {labels.fieldTitle}
                <input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder={labels.titlePlaceholder}
                  className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] font-normal text-text-primary outline-none focus:border-accent-primary"
                />
              </label>
              <label className="flex flex-1 flex-col text-[12px] font-medium text-text-secondary">
                {labels.fieldBody}
                <textarea
                  value={editor.body}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, body: event.target.value }))
                  }
                  rows={12}
                  placeholder={labels.bodyPlaceholder}
                  className="mt-1 w-full flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 font-mono text-[13px] font-normal leading-relaxed text-text-primary outline-none focus:border-accent-primary"
                />
              </label>
              {!editor.isNew && editor.sourceConversationId !== null && onOpenConversation && (
                <button
                  type="button"
                  onClick={() => onOpenConversation(editor.sourceConversationId as number)}
                  className="inline-flex items-center gap-1.5 self-start text-[12px] text-accent-primary hover:underline"
                >
                  <ExternalLink strokeWidth={1.7} className="h-3.5 w-3.5" />
                  {labels.openSource}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-5 py-3">
              {!editor.isNew && editor.id !== null ? (
                <button
                  type="button"
                  onClick={() => void handleDelete(editor.id as number)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <Trash2 strokeWidth={1.7} className="h-4 w-4" />
                  {labels.deleteBtn}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-lg border border-border-subtle px-3 py-1.5 text-[13px] text-text-secondary hover:bg-bg-surface-card"
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  className="rounded-lg bg-accent-primary px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                >
                  {labels.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-text-primary px-4 py-2 text-[13px] text-bg-primary shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
