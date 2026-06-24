import "~style.css";
import "katex/dist/katex.min.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiThemeMode } from "~lib/types";
import {
  buildPlazaPrompts,
  getCuratedCategories,
  resolveCuratedPrompts,
} from "~lib/promptPlaza/commonPrompts";
import {
  getAdoptedPlazaIds,
  setPlazaAdopted,
  subscribeAdoptedPlazaIds,
} from "~lib/promptPlaza/plazaCollectionService";
import {
  connectObsidianVault,
  exportNoteToObsidian,
  getObsidianVaultStatus,
} from "~lib/services/obsidianVaultService";
import {
  applyUiTheme,
  getUiSettings,
  initializeUiTheme,
  setUiThemeMode,
  subscribeUiSettings,
} from "~lib/services/uiSettingsService";
import { LOGO_BASE64 } from "~lib/ui/logo";
import { I18nProvider, useI18n } from "~lib/i18n";
import {
  getConversations,
  getTopics,
  runGardener,
  getRelatedConversations,
  getAllEdges,
  getMessages,
  getAnnotationsByConversation,
  saveAnnotation,
  deleteAnnotation,
  exportAnnotationToNote,
  exportAnnotationToNotion,
  updateConversation,
  updateConversationTitle,
  deleteConversation,
  renameFolderTag,
  moveFolderTag,
  removeFolderTag,
  askKnowledgeBase,
  createExploreSession,
  listExploreSessions,
  getExploreSession,
  getExploreMessages,
  deleteExploreSession,
  renameExploreSession,
  updateExploreMessageContext,
  getSummary,
  generateSummary,
  getNotes,
  saveNote,
  updateNote,
  deleteNote,
  importObsidianDirectory,
  importObsidianZip,
  getNoteAsset,
  getStorageUsage,
  exportData,
  clearAllData,
  listPrompts,
  searchPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptFavorite,
  incrementPromptUsage,
  extractPromptsFromLibrary,
  completePrompt,
} from "~lib/services/storageService";
import { VestiDashboard as VestiDashboardShell } from "~vendor/vesti-ui";

type ThemeSyncStatus = "idle" | "syncing" | "error";

void initializeUiTheme().catch(() => {
  // Keep default light theme tokens if initialization fails.
});

function getThemeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Theme update failed.";
}

export default function VestiDashboardPage() {
  const [themeMode, setThemeMode] = useState<UiThemeMode>(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
  const [themeSyncStatus, setThemeSyncStatus] = useState<ThemeSyncStatus>("idle");
  const [themeSyncMessage, setThemeSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUiSettings()
      .then((settings) => {
        if (cancelled) return;
        setThemeMode(settings.themeMode);
        applyUiTheme(settings.themeMode);
        setThemeSyncStatus("idle");
      })
      .catch((error) => {
        if (cancelled) return;
        setThemeSyncStatus("error");
        setThemeSyncMessage(getThemeErrorMessage(error));
      });

    const unsubscribe = subscribeUiSettings((settings) => {
      if (cancelled) return;
      setThemeMode(settings.themeMode);
      applyUiTheme(settings.themeMode);
      setThemeSyncStatus("idle");
      setThemeSyncMessage(null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleToggleTheme = useCallback(async () => {
    const previous = themeMode;
    const next: UiThemeMode = previous === "dark" ? "light" : "dark";

    setThemeMode(next);
    applyUiTheme(next);
    setThemeSyncStatus("syncing");
    setThemeSyncMessage(null);

    try {
      const saved = await setUiThemeMode(next);
      setThemeMode(saved.themeMode);
      applyUiTheme(saved.themeMode);
      setThemeSyncStatus("idle");
      setThemeSyncMessage(null);
    } catch (error) {
      setThemeMode(previous);
      applyUiTheme(previous);
      setThemeSyncStatus("error");
      setThemeSyncMessage(getThemeErrorMessage(error));
    }
  }, [themeMode]);

  return (
    <I18nProvider>
      <VestiDashboardInner
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        themeSyncStatus={themeSyncStatus}
        themeSyncMessage={themeSyncMessage}
      />
    </I18nProvider>
  );
}

function VestiDashboardInner({
  themeMode,
  onToggleTheme,
  themeSyncStatus,
  themeSyncMessage,
}: {
  themeMode: UiThemeMode;
  onToggleTheme: () => Promise<void>;
  themeSyncStatus: ThemeSyncStatus;
  themeSyncMessage: string | null;
}) {
  const { t, locale } = useI18n();
  const lang = locale === "zh" ? "zh" : "en";

  // 提示词广场 + 提示词超市: bundled curated catalog, localized. Daily picks are
  // date-seeded; the supermarket is the full catalog grouped by big-category;
  // adopted ids are the user's personal shelf (chrome.storage.local).
  const [adoptedIds, setAdoptedIds] = useState<string[]>([]);
  useEffect(() => {
    void getAdoptedPlazaIds().then(setAdoptedIds);
    return subscribeAdoptedPlazaIds(setAdoptedIds);
  }, []);

  const plaza = useMemo(() => {
    const daily = buildPlazaPrompts(lang, Date.now()).filter((p) => p.featured);
    const resolved = resolveCuratedPrompts(lang);
    const supermarket = getCuratedCategories(lang).map((category) => ({
      category,
      prompts: resolved.filter((p) => p.category === category),
    }));
    return { daily, supermarket, adoptedIds };
  }, [lang, adoptedIds]);

  const handlePlazaAdoptToggle = useCallback((id: string, adopt: boolean) => {
    void setPlazaAdopted(id, adopt).then(setAdoptedIds);
  }, []);

  return (
    <VestiDashboardShell
      logoSrc={LOGO_BASE64}
      rootClassName="vesti-options"
      labels={t.dashboard}
      plaza={plaza}
      onPlazaAdoptToggle={handlePlazaAdoptToggle}
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
      themeSyncStatus={themeSyncStatus}
      themeSyncMessage={themeSyncMessage}
      storage={{
        getConversations,
        getTopics,
        runGardener,
        getRelatedConversations,
        getAllEdges,
        getMessages,
        getAnnotationsByConversation,
        saveAnnotation,
        deleteAnnotation,
        exportAnnotationToNote,
        exportAnnotationToNotion,
        updateConversation,
        updateConversationTitle,
        deleteConversation,
        renameFolderTag,
        moveFolderTag,
        removeFolderTag,
        askKnowledgeBase,
        createExploreSession,
        listExploreSessions,
        getExploreSession,
        getExploreMessages,
        deleteExploreSession,
        renameExploreSession,
        updateExploreMessageContext,
        getSummary,
        generateSummary,
        getNotes,
        saveNote,
        updateNote,
        deleteNote,
        getObsidianVaultStatus,
        connectObsidianVault,
        exportNoteToObsidian,
        importObsidianDirectory,
        importObsidianZip,
        getNoteAsset,
        getStorageUsage,
        exportData,
        clearAllData,
        listPrompts,
        searchPrompts,
        createPrompt,
        updatePrompt,
        deletePrompt,
        togglePromptFavorite,
        incrementPromptUsage,
        extractPromptsFromLibrary,
        completePrompt,
      }}
    />
  );
}
