import "~style.css";

import { useEffect } from "react";
import {
  applyUiTheme,
  initializeUiTheme,
  subscribeUiSettings,
} from "~lib/services/uiSettingsService";
import { I18nProvider } from "~lib/i18n";
import { VestiSidepanel } from "./VestiSidepanel";

void initializeUiTheme().catch(() => {
  // Ignore theme initialization failures and keep default light tokens.
});

function VestiSidepanelPage() {
  useEffect(() => {
    const unsubscribe = subscribeUiSettings((settings) => {
      applyUiTheme(settings.themeMode);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <I18nProvider>
      <VestiSidepanel />
    </I18nProvider>
  );
}

export default VestiSidepanelPage;
