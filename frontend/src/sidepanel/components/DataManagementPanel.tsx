import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FolderArchive,
  Loader2,
  Trash2,
  TriangleAlert,
  Upload
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent
} from "react"
import { useI18n } from "~lib/i18n"

import {
  clearAllData,
  clearInsightsCache,
  exportData,
  getDataOverview,
  importData
} from "~lib/services/storageService"
import type {
  AsyncStatus,
  DataOverviewSnapshot,
  ExportFormat,
  ImportDataResult,
  StorageUsageSnapshot
} from "~lib/types"

const FALLBACK_SOFT_LIMIT = 900 * 1024 * 1024
const FALLBACK_HARD_LIMIT = 1024 * 1024 * 1024

type AccordionKey = "storage" | "export" | "cleanup"

interface DataAccordionProps {
  icon: React.ReactNode
  iconTone: "storage" | "export" | "cleanup" | "dashboard"
  label: string
  subtitle: string
  open?: boolean
  disabled?: boolean
  soonTag?: string
  onToggle?: () => void
  children?: React.ReactNode
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  const digits = size >= 100 || unitIndex === 0 ? 0 : 1
  return `${size.toFixed(digits)} ${units[unitIndex]}`
}

function formatDateTime(value: number | null, locale: string = "en"): string {
  if (!value || !Number.isFinite(value)) return "—"
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return `${value}`
}

function buildLimitLabel(limit: number): string {
  if (!Number.isFinite(limit) || limit <= 0) return "Unknown"
  return formatBytes(limit)
}

function formatImportSummary(result: ImportDataResult): string {
  return [
    `${result.conversations} threads`,
    `${result.messages} messages`,
    `${result.summaries} summaries`,
    `${result.weeklyReports} weekly reports`,
    `${result.annotations} annotations`
  ].join(", ")
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function DataAccordion({
  icon,
  iconTone,
  label,
  subtitle,
  open = false,
  disabled = false,
  soonTag,
  onToggle,
  children
}: DataAccordionProps) {
  return (
    <section
      className={`data-acc-item ${open ? "is-open" : ""} ${
        disabled ? "is-disabled" : ""
      }`}>
      <button
        type="button"
        className="data-acc-header"
        onClick={disabled ? undefined : onToggle}
        aria-expanded={disabled ? undefined : open}
        aria-disabled={disabled || undefined}>
        <span className={`data-acc-icon data-acc-icon-${iconTone}`}>
          {icon}
        </span>
        <span className="data-acc-text">
          <span className="data-acc-label">{label}</span>
          <span className="data-acc-subtitle">{subtitle}</span>
        </span>
        <span className="data-acc-right">
          {soonTag ? (
            <span className="data-soon-badge">{soonTag}</span>
          ) : (
            <ChevronDown
              className="data-acc-chevron h-4 w-4"
              strokeWidth={1.8}
            />
          )}
        </span>
      </button>

      {!disabled ? (
        <div className={`data-acc-body ${open ? "is-open" : ""}`}>
          <div className="data-acc-inner">{children}</div>
        </div>
      ) : null}
    </section>
  )
}

export function DataManagementPanel() {
  const { t, locale } = useI18n()
  const [overview, setOverview] = useState<DataOverviewSnapshot | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [status, setStatus] = useState<AsyncStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [openMap, setOpenMap] = useState<Record<AccordionKey, boolean>>({
    storage: true,
    export: false,
    cleanup: false
  })
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const refreshOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const result = await getDataOverview()
      setOverview(result)
    } catch (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshOverview()
  }, [refreshOverview])

  const toggleAccordion = (key: AccordionKey) => {
    setOpenMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleExport = async (format: ExportFormat) => {
    setActionKey(`export-${format}`)
    setStatus("loading")
    setMessage(null)
    try {
      const file = await exportData(format)
      triggerDownload(file.blob, file.filename)
      setStatus("ready")
      setMessage(`Exported ${file.filename}`)
    } catch (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
    } finally {
      setActionKey(null)
      await refreshOverview()
    }
  }

  const handleImportTrigger = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ""

    if (!file) return

    const confirmed = window.confirm(
      `Import ${file.name}?\n\nThis will replace local conversations, messages, summaries, weekly reports, annotations, and search vectors with the JSON backup.\nLLM settings, notes, topics, and Explore sessions stay unchanged.`
    )
    if (!confirmed) {
      setStatus("idle")
      setMessage("Import cancelled.")
      return
    }

    setActionKey("import-json")
    setStatus("loading")
    setMessage(null)

    try {
      const content = await file.text()
      const result = await importData(content)
      setStatus("ready")
      setMessage(`Imported ${formatImportSummary(result)} from ${file.name}`)
    } catch (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
    } finally {
      setActionKey(null)
      await refreshOverview()
    }
  }

  const handleClearInsightsCache = async () => {
    const confirmed = window.confirm(
      "Clear cached summaries and weekly reports only?\nConversations and messages will be kept."
    )
    if (!confirmed) return

    setActionKey("clear-insights-cache")
    setStatus("loading")
    setMessage(null)
    try {
      await clearInsightsCache()
      setStatus("ready")
      setMessage(
        "Insights cache cleared. Conversations and messages were kept."
      )
    } catch (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
    } finally {
      setActionKey(null)
      await refreshOverview()
    }
  }

  const handleClearAllData = async () => {
    const input = window.prompt(
      "This will clear all local conversations, messages, summaries, and weekly reports.\nType DELETE to continue:"
    )
    if (input !== "DELETE") {
      setStatus("idle")
      setMessage("Clear cancelled.")
      return
    }

    setActionKey("clear-all-data")
    setStatus("loading")
    setMessage(null)
    try {
      await clearAllData()
      setStatus("ready")
      setMessage("Local data cleared. LLM configuration is kept.")
    } catch (error) {
      setStatus("error")
      setMessage(getErrorMessage(error))
    } finally {
      setActionKey(null)
      await refreshOverview()
    }
  }

  const storage: StorageUsageSnapshot | null = overview?.storage ?? null
  const used = storage?.originUsed ?? 0
  const hardLimit = storage?.hardLimit ?? FALLBACK_HARD_LIMIT
  const softLimit = storage?.softLimit ?? FALLBACK_SOFT_LIMIT
  const usagePercentRaw = hardLimit > 0 ? (used / hardLimit) * 100 : 0
  const usagePercent = Math.min(
    100,
    Math.max(used > 0 ? 0.8 : 0, usagePercentRaw)
  )

  const statusTone = useMemo(() => {
    if (!storage || storage.status === "ok") {
      return { label: t.data.healthy, cls: "is-healthy" }
    }
    if (storage.status === "warning") {
      return { label: t.data.softLimitWarning, cls: "is-warning" }
    }
    return { label: t.data.writeBlocked, cls: "is-danger" }
  }, [storage, t])

  const exportOptions: Array<{
    format: ExportFormat
    name: string
    description: string
  }> = [
    {
      format: "json",
      name: "JSON",
      description: t.data.exportJsonDesc
    },
    {
      format: "txt",
      name: "TXT",
      description: t.data.exportTxtDesc
    },
    {
      format: "md",
      name: "MD",
      description: t.data.exportMdDesc
    }
  ]

  return (
    <div className="data-page-stack">
      <p className="data-group-label">{t.data.overview}</p>
      <DataAccordion
        icon={<Database className="h-4 w-4" strokeWidth={1.8} />}
        iconTone="storage"
        label={t.data.storage}
        subtitle={t.data.storageDesc}
        open={openMap.storage}
        onToggle={() => toggleAccordion("storage")}>
        <div className="data-stat-row">
          <span className="data-stat-label">{t.data.usedAppLimit}</span>
          <span className="data-stat-value">
            {formatBytes(used)} / {buildLimitLabel(hardLimit)}
          </span>
        </div>

        <div className="data-progress-track">
          <div
            className="data-progress-fill"
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <div className="data-stat-row">
          <span className="data-stat-label">{t.data.browserQuota}</span>
          <span className="data-stat-value data-inline-status">
            {storage?.originQuota
              ? formatBytes(storage.originQuota)
              : t.data.unknown}
            <span className={`data-status-pill ${statusTone.cls}`}>
              <span className="data-status-dot" />
              {statusTone.label}
            </span>
          </span>
        </div>

        {storage?.status === "warning" ? (
          <p className="data-state-note is-warning">
            {t.data.storageWarning}
          </p>
        ) : null}
        {storage?.status === "blocked" ? (
          <p className="data-state-note is-danger">
            {t.data.storageBlocked}
          </p>
        ) : null}

        <div className="data-inner-divider" />

        <button
          type="button"
          className={`data-detail-toggle ${detailOpen ? "is-open" : ""}`}
          onClick={() => setDetailOpen((prev) => !prev)}>
          <ChevronRight
            className="data-detail-chevron h-3 w-3"
            strokeWidth={1.8}
          />
          <span>{t.data.advancedStorageDetails}</span>
        </button>

        <div className={`data-detail-rows ${detailOpen ? "is-open" : ""}`}>
          <div className="data-detail-item">
            <span>{t.data.threadsStored}</span>
            <span>{formatCount(overview?.totalConversations)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.compactedThreads}</span>
            <span>{formatCount(overview?.compactedThreads)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.summaryRecords}</span>
            <span>{formatCount(overview?.summaryRecordCount)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.weeklyReports}</span>
            <span>{formatCount(overview?.weeklyReportCount)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.indexedDbStore}</span>
            <span>{overview?.indexedDbName ?? "MemoryHubDB"}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.lastCompaction}</span>
            <span>{formatDateTime(overview?.lastCompactionAt ?? null, locale)}</span>
          </div>
          <p className="data-detail-note">
            {t.data.compactionNote}
          </p>
          <div className="data-detail-item">
            <span>{t.data.softLimit}</span>
            <span>{buildLimitLabel(softLimit)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.chromeStorageUsed}</span>
            <span>{formatBytes(storage?.localUsed ?? 0)}</span>
          </div>
          <div className="data-detail-item">
            <span>{t.data.estimatedIndexedDb}</span>
            <span>
              {formatBytes(
                storage
                  ? Math.max(storage.originUsed - storage.localUsed, 0)
                  : 0
              )}
            </span>
          </div>
        </div>
      </DataAccordion>

      <p className="data-group-label">{t.data.operations}</p>
      <DataAccordion
        icon={<Download className="h-4 w-4" strokeWidth={1.8} />}
        iconTone="export"
        label={t.data.export}
        subtitle={t.data.exportDesc}
        open={openMap.export}
        onToggle={() => toggleAccordion("export")}>
        <p className="data-subgroup-label">Export format</p>
        <div className="data-export-list">
          {exportOptions.map((item) => {
            const busy = actionKey === `export-${item.format}`
            return (
              <div className="data-export-item" key={item.format}>
                <div className="data-export-info">
                  <p className="data-export-name">{item.name}</p>
                  <p className="data-export-desc">{item.description}</p>
                </div>
                <button
                  type="button"
                  className="data-export-btn"
                  disabled={Boolean(actionKey)}
                  onClick={() => handleExport(item.format)}>
                  {busy ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                  )}
                  {t.data.exportAction}
                </button>
              </div>
            )
          })}
          <div className="data-export-item">
            <div className="data-export-info">
              <p className="data-export-name">{t.data.importJson}</p>
              <p className="data-export-desc">
                {t.data.importJsonDesc}
              </p>
            </div>
            <button
              type="button"
              className="data-export-btn"
              disabled={Boolean(actionKey)}
              onClick={handleImportTrigger}>
              {actionKey === "import-json" ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.8}
                />
              ) : (
                <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
              {t.data.importAction}
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFileChange}
          style={{ display: "none" }}
        />
      </DataAccordion>

      <DataAccordion
        icon={<FolderArchive className="h-4 w-4" strokeWidth={1.8} />}
        iconTone="cleanup"
        label={t.data.cleanup}
        subtitle={t.data.cleanupDesc}
        open={openMap.cleanup}
        onToggle={() => toggleAccordion("cleanup")}>
        <div className="data-clean-card">
          <div className="data-clean-card-head">
            <p className="data-clean-card-title">{t.data.insightsCache}</p>
            <button
              type="button"
              className="data-secondary-btn"
              disabled={Boolean(actionKey)}
              onClick={handleClearInsightsCache}>
              {actionKey === "clear-insights-cache" ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.8}
                />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
              {t.data.clearCache}
            </button>
          </div>
          <p className="data-clean-card-desc">
            {t.data.clearCacheDesc}
          </p>
        </div>

        <div className="data-danger-zone">
          <div className="data-danger-head">
            <TriangleAlert className="h-4 w-4" strokeWidth={1.8} />
            <span>{t.data.dangerZone}</span>
          </div>
          <p className="data-danger-desc">
            {t.data.dangerDesc}
          </p>
          <button
            type="button"
            className="data-danger-btn"
            disabled={Boolean(actionKey)}
            onClick={handleClearAllData}>
            {actionKey === "clear-all-data" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
            ) : (
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
            {t.data.clearLocalData}
          </button>
        </div>
      </DataAccordion>

      <p className="data-group-label">{t.data.roadmap}</p>
      <DataAccordion
        icon={<BarChart3 className="h-4 w-4" strokeWidth={1.8} />}
        iconTone="dashboard"
        label={t.data.dashboard}
        subtitle={t.data.dashboardDesc}
        disabled
        soonTag={t.common.soon}
      />

      {(overviewLoading || actionKey) && (
        <p className="data-feedback-row">
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          {actionKey ? "Running data action..." : "Refreshing data overview..."}
        </p>
      )}

      {message && !overviewLoading && (
        <p
          className={`data-feedback-row ${status === "error" ? "is-error" : ""}`}>
          {message}
        </p>
      )}
    </div>
  )
}
