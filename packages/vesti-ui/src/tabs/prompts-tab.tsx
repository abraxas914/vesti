"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  DashboardLabels,
  Prompt,
  PromptListFilter,
  StorageApi,
  UiThemeMode,
} from "../types";
import { getPlatformBadgeStyle, getPlatformLabel } from "../constants/platform";

interface PromptsTabProps {
  storage: StorageApi;
  themeMode?: UiThemeMode;
  isActive?: boolean;
  onOpenConversation?: (conversationId: number) => void;
  labels: DashboardLabels["prompts"];
}

type LoadStatus = "idle" | "loading" | "ready" | "error";
type SortKey = NonNullable<PromptListFilter["sort"]>;

interface EditorState {
  open: boolean;
  isNew: boolean;
  id: number | null;
  title: string;
  body: string;
  category: string;
  tags: string;
  isFavorite: boolean;
  summary: string | null;
  sourceConversationId: number | null;
  sourcePlatform: Prompt["source_platform"];
  qualityScore: number;
}

const EMPTY_EDITOR: EditorState = {
  open: false,
  isNew: false,
  id: null,
  title: "",
  body: "",
  category: "",
  tags: "",
  isFavorite: false,
  summary: null,
  sourceConversationId: null,
  sourcePlatform: null,
  qualityScore: 0,
};

function scoreLabel(score: number, labels: DashboardLabels["prompts"]): string {
  if (score >= 0.7) return labels.scoreHigh;
  if (score >= 0.45) return labels.scoreGood;
  return labels.scorePoor;
}

function scoreTone(score: number): string {
  if (score >= 0.7) return "text-emerald-600";
  if (score >= 0.45) return "text-amber-600";
  return "text-text-tertiary";
}

export function PromptsTab({
  storage,
  themeMode = "light",
  isActive = false,
  onOpenConversation,
  labels,
}: PromptsTabProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [extractStatus, setExtractStatus] = useState<"idle" | "running">("idle");
  const [improving, setImproving] = useState(false);
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

  // #4: Auto-build the prompt library from captured conversations when the tab
  // opens, if the library is empty or the last extraction is stale (>1h). Runs
  // once per mount; the manual "Extract from chats" button remains for refresh.
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const prompt of prompts) {
      if (prompt.category) set.add(prompt.category);
    }
    return Array.from(set).sort();
  }, [prompts]);

  const visiblePrompts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let list = prompts.filter((prompt) => {
      if (favoritesOnly && !prompt.is_favorite) return false;
      if (categoryFilter !== null && prompt.category !== categoryFilter) return false;
      if (needle) {
        const haystack = `${prompt.title} ${prompt.body} ${prompt.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "score") return b.quality_score - a.quality_score || b.updated_at - a.updated_at;
      if (sort === "usage") return b.use_count - a.use_count || b.updated_at - a.updated_at;
      return b.updated_at - a.updated_at;
    });

    return list;
  }, [prompts, search, favoritesOnly, categoryFilter, sort]);

  const favoriteCount = useMemo(
    () => prompts.filter((prompt) => prompt.is_favorite).length,
    [prompts],
  );

  const openEditorFor = useCallback((prompt: Prompt) => {
    setEditor({
      open: true,
      isNew: false,
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      category: prompt.category ?? "",
      tags: prompt.tags.join(", "),
      isFavorite: prompt.is_favorite,
      summary: prompt.summary,
      sourceConversationId: prompt.source_conversation_id,
      sourcePlatform: prompt.source_platform,
      qualityScore: prompt.quality_score,
    });
  }, []);

  const openNewEditor = useCallback(() => {
    setEditor({ ...EMPTY_EDITOR, open: true, isNew: true });
  }, []);

  const closeEditor = useCallback(() => setEditor(EMPTY_EDITOR), []);

  const handleSave = useCallback(async () => {
    const body = editor.body.trim();
    if (!body) {
      setToast(labels.toastBodyEmpty);
      return;
    }
    const tags = editor.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const category = editor.category.trim() || null;

    try {
      if (editor.isNew || editor.id === null) {
        if (!storage.createPrompt) return;
        const { created } = await storage.createPrompt({
          title: editor.title.trim() || undefined,
          body,
          category,
          tags,
          is_favorite: editor.isFavorite,
          source: "manual",
        });
        setToast(created ? labels.toastSaved : labels.toastDuplicate);
      } else {
        if (!storage.updatePrompt) return;
        await storage.updatePrompt(editor.id, {
          title: editor.title.trim() || undefined,
          body,
          category,
          tags,
          is_favorite: editor.isFavorite,
        });
        setToast(labels.toastUpdated);
      }
      closeEditor();
      await load();
    } catch (saveError) {
      setToast((saveError as Error)?.message ?? labels.toastSaveFailed);
    }
  }, [editor, storage, closeEditor, load, labels]);

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
    [storage, editor.id, closeEditor, load, labels],
  );

  const handleToggleFavorite = useCallback(
    async (prompt: Prompt) => {
      if (!storage.togglePromptFavorite) return;
      try {
        await storage.togglePromptFavorite(prompt.id, !prompt.is_favorite);
        setPrompts((prev) =>
          prev.map((item) =>
            item.id === prompt.id ? { ...item, is_favorite: !item.is_favorite } : item,
          ),
        );
      } catch {
        setToast(labels.toastFavoriteFailed);
      }
    },
    [storage, labels],
  );

  const handleCopy = useCallback(
    async (prompt: Prompt) => {
      try {
        await navigator.clipboard.writeText(prompt.body);
        setToast(labels.toastCopied);
        if (storage.incrementPromptUsage) {
          await storage.incrementPromptUsage(prompt.id);
          setPrompts((prev) =>
            prev.map((item) =>
              item.id === prompt.id ? { ...item, use_count: item.use_count + 1 } : item,
            ),
          );
        }
      } catch {
        setToast(labels.toastClipboard);
      }
    },
    [storage, labels],
  );

  const handleImprove = useCallback(async () => {
    if (!storage.completePrompt) {
      setToast(labels.toastNoLlm);
      return;
    }
    const draft = editor.body.trim();
    if (!draft) {
      setToast(labels.draftFirst);
      return;
    }
    setImproving(true);
    try {
      const result = await storage.completePrompt({ draft, useLibrary: true });
      setEditor((prev) => ({ ...prev, body: result.completion }));
      setToast(result.usedLlm ? labels.toastImproved : labels.toastNoLlm);
    } catch (improveError) {
      setToast((improveError as Error)?.message ?? labels.toastImproveFailed);
    } finally {
      setImproving(false);
    }
  }, [storage, editor.body, labels]);

  const handleExtract = useCallback(async () => {
    if (!storage.extractPromptsFromLibrary) return;
    setExtractStatus("running");
    try {
      const result = await storage.extractPromptsFromLibrary({ scope: "recent" });
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
  }, [storage, load, labels]);

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
              .replace("{favorites}", String(favoriteCount))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExtract}
            disabled={extractStatus === "running"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[13px] text-text-primary transition-colors hover:bg-bg-surface-card disabled:opacity-60"
            title={labels.extractTooltip}
          >
            <Sparkles strokeWidth={1.7} className="h-4 w-4" />
            {extractStatus === "running" ? labels.extracting : labels.extractFromChats}
          </button>
          <button
            type="button"
            onClick={openNewEditor}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus strokeWidth={2} className="h-4 w-4" />
            {labels.newPrompt}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-6 py-3">
        <div className="relative flex-1 min-w-[180px]">
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
        <button
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
            favoritesOnly
              ? "border-amber-400 bg-amber-50 text-amber-700"
              : "border-border-subtle text-text-secondary hover:bg-bg-surface-card"
          }`}
        >
          <Star
            strokeWidth={1.7}
            className="h-4 w-4"
            fill={favoritesOnly ? "currentColor" : "none"}
          />
          {labels.favorites}
        </button>
        <select
          value={categoryFilter ?? ""}
          onChange={(event) => setCategoryFilter(event.target.value || null)}
          className="rounded-lg border border-border-subtle bg-bg-primary py-1.5 px-2 text-[13px] text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="">{labels.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          className="rounded-lg border border-border-subtle bg-bg-primary py-1.5 px-2 text-[13px] text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="recent">{labels.sortRecent}</option>
          <option value="score">{labels.sortQuality}</option>
          <option value="usage">{labels.sortUsage}</option>
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {status === "loading" && (
          <p className="py-12 text-center text-[13px] text-text-tertiary">{labels.loading}</p>
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
        {status === "ready" && visiblePrompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wand2 strokeWidth={1.4} className="mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-[14px] text-text-secondary">
              {prompts.length === 0 ? labels.emptyNone : labels.emptyFiltered}
            </p>
            {prompts.length === 0 && (
              <p className="mt-1 max-w-sm text-[12px] text-text-tertiary">
                {labels.emptyHint}
              </p>
            )}
          </div>
        )}
        {status === "ready" && visiblePrompts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiblePrompts.map((prompt) => (
              <article
                key={prompt.id}
                className="group flex cursor-pointer flex-col rounded-xl border border-border-subtle bg-bg-surface-card p-4 transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
                onClick={() => openEditorFor(prompt)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-[14px] font-medium text-text-primary">
                    {prompt.title}
                  </h3>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleFavorite(prompt);
                    }}
                    className={`shrink-0 rounded p-1 transition-colors ${
                      prompt.is_favorite
                        ? "text-amber-500"
                        : "text-text-tertiary hover:text-amber-500"
                    }`}
                    aria-label={prompt.is_favorite ? labels.unfavorite : labels.favorite}
                  >
                    <Star
                      strokeWidth={1.7}
                      className="h-4 w-4"
                      fill={prompt.is_favorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-text-secondary">
                  {prompt.body}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {prompt.category && (
                    <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-secondary">
                      {prompt.category}
                    </span>
                  )}
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-text-tertiary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5 text-[11px] text-text-tertiary">
                  <span className="flex items-center gap-2">
                    <span className={scoreTone(prompt.quality_score)}>
                      {scoreLabel(prompt.quality_score, labels)} ·{" "}
                      {Math.round(prompt.quality_score * 100)}
                    </span>
                    {prompt.use_count > 0 && (
                      <span>
                        · {labels.usedTimes.replace("{n}", String(prompt.use_count))}
                      </span>
                    )}
                    {prompt.source === "extracted" && prompt.source_platform && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={getPlatformBadgeStyle(prompt.source_platform, themeMode)}
                      >
                        {getPlatformLabel(prompt.source_platform)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopy(prompt);
                      }}
                      className="rounded p-1 hover:bg-bg-tertiary hover:text-text-primary"
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
                      className="rounded p-1 hover:bg-red-50 hover:text-red-600"
                      aria-label={labels.deleteAria}
                    >
                      <Trash2 strokeWidth={1.7} className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </article>
            ))}
          </div>
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
                <span className="flex items-center justify-between">
                  {labels.fieldBody}
                  <button
                    type="button"
                    onClick={() => void handleImprove()}
                    disabled={improving}
                    className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] font-normal text-accent-primary transition-colors hover:bg-bg-surface-card disabled:opacity-60"
                    title={labels.improveTooltip}
                  >
                    <Wand2 strokeWidth={1.7} className="h-3.5 w-3.5" />
                    {improving ? labels.improving : labels.improveWithAI}
                  </button>
                </span>
                <textarea
                  value={editor.body}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, body: event.target.value }))
                  }
                  rows={10}
                  placeholder={labels.bodyPlaceholder}
                  className="mt-1 w-full flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 font-mono text-[13px] font-normal leading-relaxed text-text-primary outline-none focus:border-accent-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[12px] font-medium text-text-secondary">
                  {labels.fieldCategory}
                  <input
                    value={editor.category}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder={labels.categoryPlaceholder}
                    className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] font-normal text-text-primary outline-none focus:border-accent-primary"
                  />
                </label>
                <label className="text-[12px] font-medium text-text-secondary">
                  {labels.fieldTags}
                  <input
                    value={editor.tags}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder={labels.tagsPlaceholder}
                    className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] font-normal text-text-primary outline-none focus:border-accent-primary"
                  />
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
                <input
                  type="checkbox"
                  checked={editor.isFavorite}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, isFavorite: event.target.checked }))
                  }
                />
                {labels.markFavorite}
              </label>
              {editor.summary && (
                <div className="rounded-lg bg-bg-surface-card px-3 py-2 text-[12px] text-text-secondary">
                  <span className="font-medium text-text-primary">{labels.summaryLabel}</span>
                  {editor.summary}
                </div>
              )}
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
