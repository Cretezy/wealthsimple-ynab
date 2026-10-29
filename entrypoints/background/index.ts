import type { BackgroundMessage, SyncStatus } from "@/lib/messages";
import { loadSettings, saveSettings, getEffectiveToken } from "./storage";
import { formatError, isAuthError, isWealthsimpleAuthError } from "./errors";
import { readWealthsimpleAuth, findWealthsimpleAccountId } from "./wealthsimple";
import { syncTransactions, type SyncConfig } from "@/lib/sync/sync";
import { YnabClient } from "@/lib/ynab/client";
import { WealthsimpleClient } from "@/lib/wealthsimple/client";
import { buildAuthUrl } from "@/lib/ynab/oauth";
import { formatLocalDate, parseLocalDate } from "@/lib/date";

export default defineBackground(() => {
  let syncStatus: SyncStatus = {
    lastSyncAt: null,
    lastResult: null,
    inProgress: false,
    error: null,
  };

  browser.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        console.error("Unhandled background error:", err);
        sendResponse({ type: "error" as const, message: formatError(err) });
      });
    return true;
  });

  async function handleMessage(message: BackgroundMessage) {
    try {
      switch (message.type) {
        case "getSettings":
          return { type: "settings" as const, settings: await loadSettings() };

        case "saveSettings":
          await saveSettings(message.settings);
          return { type: "settings" as const, settings: await loadSettings() };

        case "listBudgets": {
          const token = await getEffectiveToken();
          if (!token) return { type: "budgets" as const, budgets: [] };
          const client = new YnabClient(token, "", "");
          const budgets = await client.listBudgets();
          return { type: "budgets" as const, budgets };
        }

        case "listAccounts": {
          const token = await getEffectiveToken();
          if (!token) return { type: "accounts" as const, accounts: [] };
          const client = new YnabClient(token, message.budgetId, "");
          const accounts = await client.listAccounts();
          return { type: "accounts" as const, accounts };
        }

        case "getWealthsimpleAuth": {
          const auth = await readWealthsimpleAuth();
          return { type: "wealthsimpleAuth" as const, auth };
        }

        case "getWealthsimpleStatus": {
          const auth = await readWealthsimpleAuth();
          const accountId = await findWealthsimpleAccountId();
          return {
            type: "wealthsimpleStatus" as const,
            status: { onAccountPage: accountId !== null, accountId, signedIn: auth !== null },
          };
        }

        case "listWealthsimpleCards": {
          const auth = await readWealthsimpleAuth();
          if (!auth) return { type: "wealthsimpleCards" as const, cards: [] };
          const ws = new WealthsimpleClient("", auth);
          const accounts = await ws.fetchCreditCardAccounts();
          const cards = await Promise.all(
            accounts.map(async (a) => {
              try {
                const detail = await ws.fetchCreditCardDetail(a.id);
                const primary =
                  detail.currentCardsV2.find((c) => c.cardVariant === "primary") ??
                  detail.currentCardsV2[0];
                return {
                  id: a.id,
                  nickname: a.nickname,
                  cardNumber: primary?.cardNumberLast4Digits ?? "",
                  balance: detail.balance.current,
                  creditLimit: detail.creditLimit,
                };
              } catch (err) {
                console.error("Failed to fetch card detail for", a.id, err);
                return {
                  id: a.id,
                  nickname: a.nickname,
                  cardNumber: "",
                  balance: "",
                  creditLimit: 0,
                };
              }
            }),
          );
          return { type: "wealthsimpleCards" as const, cards };
        }

        case "authorizeYnab": {
          const state = crypto.randomUUID();
          const authUrl = buildAuthUrl(state);
          try {
            const redirectUrl = await browser.identity.launchWebAuthFlow({
              url: authUrl,
              interactive: true,
            });
            if (!redirectUrl) throw new Error("Authorization cancelled");
            // Implicit grant: token is in the URL fragment (#access_token=...)
            const fragment = new URL(redirectUrl).hash.slice(1);
            const params = new URLSearchParams(fragment);
            if (params.get("state") !== state) throw new Error("OAuth state mismatch");
            const token = params.get("access_token");
            if (!token) throw new Error("No access token in response");
            await saveSettings({ ynabAccessToken: token });
            // Re-open the popup since the OAuth flow likely closed it
            try {
              browser.action.openPopup();
            } catch {
              /* not supported in all contexts */
            }
            return { type: "settings" as const, settings: await loadSettings() };
          } catch (err) {
            return { type: "error" as const, message: formatError(err) };
          }
        }

        case "revokeYnab": {
          await saveSettings({
            ynabAccessToken: "",
            ynabBudgetId: "default",
            ynabBudgetName: "",
            ynabAccountId: "",
            ynabAccountName: "",
            wealthsimpleAccountId: "",
          });
          return { type: "settings" as const, settings: await loadSettings() };
        }

        case "syncNow": {
          // Only lock for real syncs; dry runs can run concurrently and don't block the real sync
          if (!message.dryRun) {
            if (syncStatus.inProgress) {
              return { type: "error" as const, message: "Sync already in progress" };
            }
            syncStatus = { ...syncStatus, inProgress: true, error: null };
          }

          try {
            const auth = await readWealthsimpleAuth();
            if (!auth) {
              throw new Error(
                "Not signed in to Wealthsimple. Open my.wealthsimple.com and sign in first.",
              );
            }

            const token = await getEffectiveToken();
            if (!token) {
              throw new Error("Not connected to YNAB. Authorize or set a personal access token.");
            }

            const config: SyncConfig = {
              wealthsimpleAccountId: message.config.wealthsimpleAccountId,
              wealthsimpleAuth: auth,
              ynabAccessToken: token,
              ynabBudgetId: message.config.ynabBudgetId,
              ynabAccountId: message.config.ynabAccountId,
              includePending: message.config.includePending,
              approveImported: message.config.approveImported,
              includeMemo: message.config.includeMemo,
              since: message.config.since,
            };

            const now = new Date();
            const result = await syncTransactions(config, {
              dryRun: message.dryRun,
              since: parseLocalDate(message.config.since),
              now,
            });

            const lastResult = {
              fetched: result.fetched,
              supported: result.supported,
              created: result.created,
              duplicates: result.duplicates,
              updated: result.updated,
              transactions: result.transactions,
              duplicateImportIds: result.duplicateImportIds,
            };

            if (!message.dryRun) {
              await saveSettings({ since: formatLocalDate(now) });
              syncStatus = {
                lastSyncAt: Date.now(),
                lastResult,
                inProgress: false,
                error: null,
              };
            }

            return {
              type: "syncResult" as const,
              result: {
                lastSyncAt: message.dryRun ? null : Date.now(),
                lastResult,
                inProgress: false,
                error: null,
              },
            };
          } catch (err) {
            const msg = formatError(err);
            const reauth = isAuthError(err);
            const wsReauth = isWealthsimpleAuthError(err);
            if (!message.dryRun) {
              syncStatus = { ...syncStatus, inProgress: false, error: msg };
            }
            return {
              type: "syncResult" as const,
              result: {
                lastSyncAt: null,
                lastResult: null,
                inProgress: false,
                error: msg,
                needsReauth: reauth,
                needsWealthsimpleReauth: wsReauth,
              },
            };
          }
        }

        default:
          return { type: "error" as const, message: "Unknown message type" };
      }
    } catch (err) {
      console.error("Handler error:", err);
      return {
        type: "error" as const,
        message: formatError(err),
        needsReauth: isAuthError(err),
        needsWealthsimpleReauth: isWealthsimpleAuthError(err),
      };
    }
  }
});
