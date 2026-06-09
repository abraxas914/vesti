import { useI18n } from "~lib/i18n"
import { DataManagementPanel } from "../components/DataManagementPanel";

export function DataPage() {
  const { t } = useI18n()
  return (
    <div className="vesti-shell data-page-shell">
      <header className="vesti-page-header">
        <h1 className="vesti-page-title text-text-primary">{t.pages.data}</h1>
      </header>

      <div className="data-page-scroll vesti-scroll">
        <DataManagementPanel />
      </div>
    </div>
  );
}
