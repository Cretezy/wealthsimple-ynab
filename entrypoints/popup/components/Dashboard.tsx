import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { ExtensionSettings } from "@/lib/settings";
import type { SyncStatus, WealthsimplePageStatus } from "@/lib/messages";
import type { YnabBudget, YnabAccount } from "@/lib/ynab/types";
import type { WsCard } from "../queries";
import { ApiError } from "../queries";
import { cardLabel } from "../utils";
import { ResultView } from "./ResultView";
import { PopupSelect } from "./PopupSelect";

interface DashboardProps {
  settings: ExtensionSettings;
  budgets: YnabBudget[];
  accounts: YnabAccount[];
  cards: WsCard[];
  wsStatus: WealthsimplePageStatus | null;
  isConnected: boolean;
  budgetsLoading: boolean;
  accountsLoading: boolean;
  cardsLoading: boolean;
  updateSetting: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  updateSettings: (changes: Partial<ExtensionSettings>) => void;
  syncMutation: UseMutationResult<
    SyncStatus,
    Error,
    { config: ExtensionSettings; dryRun?: boolean }
  >;
  onDisconnect: () => void;
}

export function Dashboard({
  settings,
  budgets,
  accounts,
  cards,
  wsStatus,
  isConnected,
  budgetsLoading,
  accountsLoading,
  cardsLoading,
  updateSetting,
  updateSettings,
  syncMutation,
  onDisconnect,
}: DashboardProps) {
  const queryClient = useQueryClient();
  const sinceDate = settings.since;

  const [resultView, setResultView] = useState<"dry-run" | "real" | null>(null);
  const [viewResult, setViewResult] = useState<SyncStatus | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    lastResult: null,
    inProgress: false,
    error: null,
  });

  const displayError =
    syncMutation.isError && syncMutation.error instanceof ApiError
      ? syncMutation.error.message
      : null;

  const handleReauth = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  }, [queryClient]);

  const doSync = useCallback(
    async (dryRun: boolean) => {
      if (!settings.ynabBudgetId || !settings.ynabAccountId || !settings.wealthsimpleAccountId)
        return;
      if (!dryRun) {
        setSyncStatus((s) => ({ ...s, inProgress: true, error: null }));
      }
      try {
        const result = await syncMutation.mutateAsync({ config: settings, dryRun });
        if (!dryRun) {
          setSyncStatus(result);
        }
        if (result.error && result.needsReauth) {
          handleReauth();
        } else if (result.lastResult) {
          setResultView(dryRun ? "dry-run" : "real");
          setViewResult(result);
          setViewError(null);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          const msg = err.message;
          setViewError(msg);
          setSyncStatus((s) => ({ ...s, inProgress: false, error: msg }));
          if (err.needsReauth) handleReauth();
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setViewError(msg);
          setSyncStatus((s) => ({ ...s, inProgress: false, error: msg }));
        }
      }
    },
    [settings, syncMutation, handleReauth],
  );

  const handleSync = useCallback(async () => {
    await doSync(false);
  }, [doSync]);

  const handleDryRun = useCallback(async () => {
    setViewLoading(true);
    await doSync(true);
    setViewLoading(false);
  }, [doSync]);

  const handleResultSync = useCallback(async () => {
    setViewLoading(true);
    await doSync(false);
    setViewLoading(false);
  }, [doSync]);

  const handleDateChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => updateSetting("since", e.target.value),
    [updateSetting],
  );

  const onBack = useCallback(() => {
    setResultView(null);
    setViewResult(null);
    setViewError(null);
  }, []);

  // ── Effects ────────────────────────────────────────────

  // Update cached budget name when budgets list loads
  useEffect(() => {
    if (budgets.length > 0 && settings.ynabBudgetId) {
      const b = budgets.find((b: YnabBudget) => b.id === settings.ynabBudgetId);
      if (b && b.name !== settings.ynabBudgetName) updateSetting("ynabBudgetName", b.name);
    }
  }, [budgets, settings.ynabBudgetId, settings.ynabBudgetName, updateSetting]);

  // Update cached account name when accounts list loads
  useEffect(() => {
    if (accounts.length > 0 && settings.ynabAccountId) {
      const a = accounts.find((a) => a.id === settings.ynabAccountId);
      if (a && a.name !== settings.ynabAccountName) updateSetting("ynabAccountName", a.name);
    }
  }, [accounts, settings.ynabAccountId, settings.ynabAccountName, updateSetting]);

  // Pick an initial card, but keep an existing manual selection.
  useEffect(() => {
    if (cards.length === 0 || !wsStatus) return;
    if (cards.some((c) => c.id === settings.wealthsimpleAccountId)) return;
    const initialCard =
      cards.find((c) => wsStatus.onAccountPage && c.id === wsStatus.accountId) ?? cards[0];
    if (initialCard) updateSetting("wealthsimpleAccountId", initialCard.id);
  }, [cards, wsStatus, settings.wealthsimpleAccountId, updateSetting]);

  // ── Render ─────────────────────────────────────────────

  if (resultView) {
    return (
      <ResultView
        resultView={resultView}
        viewResult={viewResult}
        viewLoading={viewLoading}
        viewError={viewError}
        status={syncStatus}
        onBack={onBack}
        onSync={handleResultSync}
      />
    );
  }

  return (
    <div className="popup">
      <div className="header">
        <div className="logo">
          <img src="/icon/32.png" className="logo-icon" alt="" />
          Wealthsimple<span className="arrow">&rarr;</span>YNAB
        </div>
        <div className="header-right">
          {wsStatus?.accountId && <div className="account-badge">● Connected</div>}
          {isConnected && (
            <button
              type="button"
              className="link-btn header-disconnect"
              onClick={onDisconnect}
              title="Disconnect YNAB"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Credit Card</div>
        <div className="field">
          <label className="field-label" htmlFor="ws-account">
            Account
          </label>
          <div className="select-wrap">
            <PopupSelect
              id="ws-account"
              value={settings.wealthsimpleAccountId}
              onChange={(value) => updateSetting("wealthsimpleAccountId", value)}
              options={[
                { value: "", label: cardsLoading ? "Loading..." : "Select..." },
                ...cards.map((c) => ({ value: c.id, label: cardLabel(c) })),
              ]}
              disabled={cardsLoading || cards.length === 0}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">YNAB</div>
        <div className="field-row">
          <div className="select-wrap">
            <label className="field-label" htmlFor="ynab-budget">
              Plan
            </label>
            <PopupSelect
              id="ynab-budget"
              value={settings.ynabBudgetId}
              onChange={(value) =>
                updateSettings({
                  ynabBudgetId: value,
                  ynabBudgetName: budgets.find((budget) => budget.id === value)?.name ?? "",
                  ynabAccountId: "",
                  ynabAccountName: "",
                })
              }
              fallbackLabel={settings.ynabBudgetName}
              options={[
                { value: "", label: budgetsLoading ? "Loading..." : "Select..." },
                { value: "default", label: "Default" },
                ...budgets.map((b) => ({ value: b.id, label: b.name })),
              ]}
              disabled={budgetsLoading}
            />
          </div>
          <div className="select-wrap">
            <label className="field-label" htmlFor="ynab-account">
              Account
            </label>
            <PopupSelect
              id="ynab-account"
              value={settings.ynabAccountId}
              onChange={(value) =>
                updateSettings({
                  ynabAccountId: value,
                  ynabAccountName: accounts.find((account) => account.id === value)?.name ?? "",
                })
              }
              fallbackLabel={settings.ynabAccountName}
              options={[
                { value: "", label: accountsLoading ? "Loading..." : "Select..." },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              disabled={!settings.ynabBudgetId || accountsLoading}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Options</div>
        <div className="field">
          <label className="field-label" htmlFor="lookback-date">
            Since
          </label>
          <input
            id="lookback-date"
            type="date"
            value={sinceDate}
            onChange={handleDateChange}
            className="input"
          />
        </div>
        <div className="toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.includePending}
              onChange={(e) => updateSetting("includePending", e.target.checked)}
            />
            <span>Pending</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.includeMemo}
              onChange={(e) => updateSetting("includeMemo", e.target.checked)}
            />
            <span>Memo</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.approveImported}
              onChange={(e) => updateSetting("approveImported", e.target.checked)}
            />
            <span>Auto-approve</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        className={`btn btn-primary btn-lg ${syncStatus.inProgress ? "btn-loading" : ""}`}
        onClick={handleSync}
        disabled={
          syncStatus.inProgress ||
          !settings.ynabBudgetId ||
          !settings.ynabAccountId ||
          !settings.wealthsimpleAccountId
        }
      >
        {syncStatus.inProgress ? "Syncing..." : "Sync Now"}
      </button>

      <div style={{ textAlign: "center", margin: "0 0 16px" }}>
        <button
          type="button"
          className="dry-run-toggle link-btn"
          onClick={handleDryRun}
          disabled={syncStatus.inProgress}
        >
          Preview import &rarr;
        </button>
      </div>

      {displayError && <div className="toast toast-error">{displayError}</div>}
    </div>
  );
}
