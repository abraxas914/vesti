import React from "react";
import { Database, FolderGit2, Home, Settings, Sparkles } from "lucide-react";
import type { PageId } from "~lib/types";
import { LOGO_BASE64 } from "~lib/ui/logo";
import { useI18n } from "~lib/i18n";

interface DockItem {
  id: PageId;
  icon: React.ReactNode;
  label: string;
}

const DataIcon = FolderGit2 ?? Database;

function getDockItemsTop(t: ReturnType<typeof useI18n>["t"]): DockItem[] {
  return [
    {
      id: "timeline",
      icon: <Home className="h-5 w-5" strokeWidth={1.75} />,
      label: t.dock.threads,
    },
    {
      id: "insights",
      icon: <Sparkles className="h-5 w-5" strokeWidth={1.75} />,
      label: t.dock.insights,
    },
  ];
}

function getDockItemsBottom(t: ReturnType<typeof useI18n>["t"]): DockItem[] {
  return [
    {
      id: "data",
      icon: <DataIcon className="h-5 w-5" strokeWidth={1.75} />,
      label: t.dock.dataManagement,
    },
    {
      id: "settings",
      icon: <Settings className="h-5 w-5" strokeWidth={1.75} />,
      label: t.dock.settings,
    },
  ];
}

interface DockProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onNavigateToLibrary: () => void;
}

export function Dock({
  currentPage,
  onNavigate,
  onNavigateToLibrary,
}: DockProps) {
  const { t } = useI18n();
  return (
    <nav
      aria-label="Vesti navigation"
      className="flex w-[52px] flex-col items-center justify-between border-l border-border-subtle bg-bg-sidebar px-1 py-4"
    >
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label={t.dock.openLibrary}
          onClick={onNavigateToLibrary}
          title={t.dock.openLibrary}
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-bg-primary/70 transition-colors [transition-duration:140ms] hover:bg-accent-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <img src={LOGO_BASE64} alt="Vesti" width={20} height={20} />
        </button>
        {getDockItemsTop(t).map((item) => (
          <DockButton
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        {getDockItemsBottom(t).map((item) => (
          <DockButton
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function DockButton({
  item,
  isActive,
  onClick,
}: {
  item: DockItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors [transition-duration:140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
        isActive
          ? "border-border-default bg-accent-primary-light text-accent-primary"
          : "border-transparent text-text-secondary hover:border-border-subtle hover:bg-accent-primary-light hover:text-accent-primary"
      }`}
    >
      {item.icon}
    </button>
  );
}
