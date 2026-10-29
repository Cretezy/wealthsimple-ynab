import { useCallback, useEffect, useState } from "react";
import type { ExtensionSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  ApiError,
  useSettingsQuery,
  useSaveSettingsMutation,
  useBudgetsQuery,
  useAccountsQuery,
  useWealthsimpleStatusQuery,
  useWealthsimpleCardsQuery,
  useSyncMutation,
  useAuthorizeMutation,
  useRevokeMutation,
} from "./queries";
import { Header } from "./components/Header";
import { ConnectScreen } from "./components/ConnectScreen";
import { Dashboard } from "./components/Dashboard";
import { WealthsimpleReauthScreen } from "./components/WealthsimpleReauthScreen";

function App() {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const token = settings.ynabAccessToken;
  const hasCredentials = token.length > 0;

  const budgetsQuery = useBudgetsQuery(hasCredentials ? token : undefined);
  const accountsQuery = useAccountsQuery(settings.ynabBudgetId, token);
  const isConnected = budgetsQuery.isSuccess;

  const [authError, setAuthError] = useState(false);
  useEffect(() => {
    if (
      budgetsQuery.isError &&
      budgetsQuery.error instanceof ApiError &&
      budgetsQuery.error.needsReauth
    ) {
      setAuthError(true);
    }
    if (budgetsQuery.isSuccess) setAuthError(false);
  }, [budgetsQuery.isError, budgetsQuery.isSuccess, budgetsQuery.error]);

  const wsStatusQuery = useWealthsimpleStatusQuery(isConnected);
  const wsStatus = wsStatusQuery.data ?? null;

  const cardsQuery = useWealthsimpleCardsQuery(isConnected && wsStatus?.signedIn === true);
  const cards = cardsQuery.data ?? [];

  const wsCardsReauth =
    cardsQuery.isError &&
    cardsQuery.error instanceof ApiError &&
    cardsQuery.error.needsWealthsimpleReauth;

  const saveSettings = useSaveSettingsMutation();
  const syncMutation = useSyncMutation();
  const authorizeMutation = useAuthorizeMutation();
  const revokeMutation = useRevokeMutation();

  const settingsLoading = settingsQuery.isPending;
  const tokenValidating = hasCredentials && budgetsQuery.isPending;
  const wsChecking = isConnected && wsStatusQuery.isPending;
  const cardsLoading = isConnected && wsStatus?.signedIn === true && cardsQuery.isPending;

  const updateSetting = useCallback(
    <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
      saveSettings.mutate({ [key]: value });
    },
    [saveSettings],
  );

  const updateSettings = useCallback(
    (changes: Partial<ExtensionSettings>) => saveSettings.mutate(changes),
    [saveSettings],
  );

  const handleDisconnect = useCallback(async () => {
    try {
      await revokeMutation.mutateAsync();
      setAuthError(false);
    } catch {
      /* silence */
    }
  }, [revokeMutation]);

  // ── Routing ──

  if (settingsLoading || tokenValidating || cardsLoading) {
    return (
      <div className="popup">
        <Header />
        <div className="empty-state">
          <p style={{ color: "#94a3b8" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || authError) {
    return (
      <ConnectScreen
        authError={authError}
        settings={settings}
        updateSetting={updateSetting}
        authorizeMutation={authorizeMutation}
        budgetsQuery={budgetsQuery}
      />
    );
  }

  if (wsChecking) {
    return (
      <div className="popup">
        <Header />
        <div className="empty-state">
          <p style={{ color: "#94a3b8" }}>Checking Wealthsimple...</p>
        </div>
      </div>
    );
  }

  if (wsStatus !== null && !wsStatus.signedIn) {
    return (
      <div className="popup">
        <Header />
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <p>Sign in to Wealthsimple to get started.</p>
          <a
            href="https://my.wealthsimple.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg"
          >
            Open Wealthsimple &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (wsCardsReauth) {
    return (
      <WealthsimpleReauthScreen
        message={cardsQuery.error instanceof ApiError ? cardsQuery.error.message : undefined}
        onRetry={() => cardsQuery.refetch()}
      />
    );
  }

  return (
    <Dashboard
      settings={settings}
      budgets={budgetsQuery.data ?? []}
      accounts={accountsQuery.data ?? []}
      cards={cards}
      wsStatus={wsStatus}
      isConnected={isConnected}
      budgetsLoading={budgetsQuery.isPending}
      accountsLoading={accountsQuery.isPending}
      cardsLoading={cardsQuery.isPending}
      updateSetting={updateSetting}
      updateSettings={updateSettings}
      syncMutation={syncMutation}
      onDisconnect={handleDisconnect}
    />
  );
}

export default App;
