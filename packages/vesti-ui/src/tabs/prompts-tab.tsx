"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Prompt, PromptListFilter, StorageApi, UiThemeMode } from "../types";
import { getPlatformBadgeStyle, getPlatformLabel } from "../constants/platform";

interface PromptsTabProps {
  storage: StorageApi;
  themeMode?: UiThemeMode;
  isActive?: boolean;
  onOpenConversation?: (conversationId: number) => void;
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

function scoreLabel(score: number): string {
  if (score >= 0.7) return "高配";
  if (score >= 0.45) return "良好";
  return "一般";
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
      setError("Prompt storage is unavailable in this build.");
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
      setError((loadError as Error)?.message ?? "Failed to load prompts.");
    }
  }, [storage]);

  useEffect(() => {
    if (isActive && status === "idle") {
      void load();
    }
  }, [isActive, status, load]);

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
      setToast("Prompt body cannot be empty.");
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
        setToast(created ? "Prompt saved." : "An identical prompt already exists.");
      } else {
        if (!storage.updatePrompt) return;
        await storage.updatePrompt(editor.id, {
          title: editor.title.trim() || undefined,
          body,
          category,
          tags,
          is_favorite: editor.isFavorite,
        });
        setToast("Prompt updated.");
      }
      closeEditor();
      await load();
    } catch (saveError) {
      setToast((saveError as Error)?.message ?? "Failed to save prompt.");
    }
  }, [editor, storage, closeEditor, load]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!storage.deletePrompt) return;
      try {
        await storage.deletePrompt(id);
        if (editor.id === id) closeEditor();
        setToast("Prompt deleted.");
        await load();
      } catch (deleteError) {
        setToast((deleteError as Error)?.message ?? "Failed to delete prompt.");
      }
    },
    [storage, editor.id, closeEditor, load],
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
        setToast("Failed to update favorite.");
      }
    },
    [storage],
  );

  const handleCopy = useCallback(
    async (prompt: Prompt) => {
      try {
        await navigator.clipboard.writeText(prompt.body);
        setToast("Copied to clipboard.");
        if (storage.incrementPromptUsage) {
          await storage.incrementPromptUsage(prompt.id);
          setPrompts((prev) =>
            prev.map((item) =>
              item.id === prompt.id ? { ...item, use_count: item.use_count + 1 } : item,
            ),
          );
        }
      } catch {
        setToast("Clipboard unavailable.");
      }
    },
    [storage],
  );

  const handleImprove = useCallback(async () => {
    if (!storage.completePrompt) {
      setToast("AI completion is unavailable in this build.");
      return;
    }
    const draft = editor.body.trim();
    if (!draft) {
      setToast("Write a draft to improve first.");
      return;
    }
    setImproving(true);
    try {
      const result = await storage.completePrompt({ draft, useLibrary: true });
      setEditor((prev) => ({ ...prev, body: result.completion }));
      setToast(
        result.usedLlm
          ? "Prompt improved with AI."
          : "No LLM configured — configure one in Settings to enable AI rewrite.",
      );
    } catch (improveError) {
      setToast((improveError as Error)?.message ?? "AI completion failed.");
    } finally {
      setImproving(false);
    }
  }, [storage, editor.body]);

  const handleExtract = useCallback(async () => {
    if (!storage.extractPromptsFromLibrary) return;
    setExtractStatus("running");
    try {
      const result = await storage.extractPromptsFromLibrary({ scope: "recent" });
      setToast(
        `Archived ${result.created} new prompt${result.created === 1 ? "" : "s"} from ${result.candidates} candidate${result.candidates === 1 ? "" : "s"}${
          result.usedLlm ? " (LLM-enriched)" : ""
        }.`,
      );
      await load();
    } catch (extractError) {
      setToast((extractError as Error)?.message ?? "Extraction failed.");
    } finally {
      setExtractStatus("idle");
    }
  }, [storage, load]);

  if (!supportsPrompts) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-text-secondary">
        <p>Prompt management is not available in this build.</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
        <div>
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.26em] text-text-primary">
            Prompt Library
          </h2>
          <p className="mt-1 text-[12px] text-text-tertiary">
            {prompts.length} prompt{prompts.length === 1 ? "" : "s"} · {favoriteCount} favorite
            {favoriteCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExtract}
            disabled={extractStatus === "running"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[13px] text-text-primary transition-colors hover:bg-bg-surface-card disabled:opacity-60"
            title="Scan recent conversations for reusable prompts"
          >
            <Sparkles strokeWidth={1.7} className="h-4 w-4" />
            {extractStatus === "running" ? "Extracting…" : "Extract from chats"}
          </button>
          <button
            type="button"
            onClick={openNewEditor}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus strokeWidth={2} className="h-4 w-4" />
            New prompt
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
            placeholder="Search prompts…"
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
          Favorites
        </button>
        <select
          value={categoryFilter ?? ""}
          onChange={(event) => setCategoryFilter(event.target.value || null)}
          className="rounded-lg border border-border-subtle bg-bg-primary py-1.5 px-2 text-[13px] text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="">All categories</option>
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
          <option value="recent">Recent</option>
          <option value="score">Quality</option>
          <option value="usage">Most used</option>
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {status === "loading" && (
          <p className="py-12 text-center text-[13px] text-text-tertiary">Loading prompts…</p>
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
                Retry
              </button>
            </div>
          </div>
        )}
        {status === "ready" && visiblePrompts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wand2 strokeWidth={1.4} className="mb-3 h-8 w-8 text-text-tertiary" />
            <p className="text-[14px] text-text-secondary">
              {prompts.length === 0
                ? "No prompts yet."
                : "No prompts match the current filters."}
            </p>
            {prompts.length === 0 && (
              <p className="mt-1 max-w-sm text-[12px] text-text-tertiary">
                Extract reusable prompts from your captured conversations, or add one manually.
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
                    aria-label={prompt.is_favorite ? "Unfavorite" : "Favorite"}
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
                      {scoreLabel(prompt.quality_score)} ·{" "}
                      {Math.round(prompt.quality_score * 100)}
                    </span>
                    {prompt.use_count > 0 && <span>· used {prompt.use_count}×</span>}
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
                      aria-label="Copy prompt"
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
                      aria-label="Delete prompt"
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
            aria-label="Close editor"
            className="flex-1 bg-black/20"
            onClick={closeEditor}
          />
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-subtle bg-bg-primary shadow-xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
              <h3 className="text-[14px] font-medium text-text-primary">
                {editor.isNew ? "New prompt" : "Edit prompt"}
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
                Title
                <input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Optional — derived from body if blank"
                  className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] font-normal text-text-primary outline-none focus:border-accent-primary"
                />
              </label>
              <label className="flex flex-1 flex-col text-[12px] font-medium text-text-secondary">
                <span className="flex items-center justify-between">
                  Prompt body
                  <button
                    type="button"
                    onClick={() => void handleImprove()}
                    disabled={improving}
                    className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] font-normal text-accent-primary transition-colors hover:bg-bg-surface-card disabled:opacity-60"
                    title="Rewrite this draft into a stronger prompt (uses your configured LLM)"
                  >
                    <Wand2 strokeWidth={1.7} className="h-3.5 w-3.5" />
                    {improving ? "Improving…" : "Improve with AI"}
                  </button>
                </span>
                <textarea
                  value={editor.body}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, body: event.target.value }))
                  }
                  rows={10}
                  placeholder="Write your reusable prompt. Use {{variables}} for placeholders."
                  className="mt-1 w-full flex-1 resize-y rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 font-mono text-[13px] font-normal leading-relaxed text-text-primary outline-none focus:border-accent-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[12px] font-medium text-text-secondary">
                  Category
                  <input
                    value={editor.category}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="e.g. Coding"
                    className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] font-normal text-text-primary outline-none focus:border-accent-primary"
                  />
                </label>
                <label className="text-[12px] font-medium text-text-secondary">
                  Tags (comma-sep)
                  <input
                    value={editor.tags}
                    onChange={(event) =>
                      setEditor((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="code, review"
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
                Mark as favorite (常用)
              </label>
              {editor.summary && (
                <div className="rounded-lg bg-bg-surface-card px-3 py-2 text-[12px] text-text-secondary">
                  <span className="font-medium text-text-primary">Summary: </span>
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
                  Open source conversation
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
                  Delete
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  className="rounded-lg bg-accent-primary px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
                >
                  Save
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
