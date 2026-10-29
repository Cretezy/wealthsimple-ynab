import type { YnabAccount, YnabBudget, YnabTransactionPayload } from "./ynab/types";
import type { ExtensionSettings } from "./settings";

// === Messages between popup/background/content ===

export type MsgGetSettings = { type: "getSettings" };
export type MsgSaveSettings = { type: "saveSettings"; settings: Partial<ExtensionSettings> };
export type MsgListBudgets = { type: "listBudgets" };
export type MsgListAccounts = {
  type: "listAccounts";
  budgetId: string;
};
export type MsgGetWealthsimpleAuth = { type: "getWealthsimpleAuth" };
export type MsgSyncNow = {
  type: "syncNow";
  config: ExtensionSettings;
  dryRun?: boolean;
};
export type MsgGetWealthsimpleStatus = { type: "getWealthsimpleStatus" };
export type MsgListWealthsimpleCards = { type: "listWealthsimpleCards" };
export type MsgAuthorizeYnab = { type: "authorizeYnab" };
export type MsgRevokeYnab = { type: "revokeYnab" };
export type SyncStatus = {
  lastSyncAt: number | null;
  lastResult: {
    fetched: number;
    supported: number;
    created: number;
    duplicates: number;
    updated: number;
    transactions?: YnabTransactionPayload[];
    duplicateImportIds?: string[];
  } | null;
  inProgress: boolean;
  error: string | null;
  needsReauth?: boolean;
  needsWealthsimpleReauth?: boolean;
};

export type BackgroundMessage =
  | MsgGetSettings
  | MsgSaveSettings
  | MsgListBudgets
  | MsgListAccounts
  | MsgGetWealthsimpleAuth
  | MsgGetWealthsimpleStatus
  | MsgListWealthsimpleCards
  | MsgAuthorizeYnab
  | MsgRevokeYnab
  | MsgSyncNow;

export type WealthsimplePageStatus = {
  onAccountPage: boolean;
  accountId: string | null;
  signedIn: boolean;
};

export type BackgroundResponse =
  | { type: "settings"; settings: ExtensionSettings }
  | { type: "budgets"; budgets: YnabBudget[] }
  | { type: "accounts"; accounts: YnabAccount[] }
  | { type: "wealthsimpleAuth"; auth: { accessToken: string; identityId: string } | null }
  | { type: "wealthsimpleStatus"; status: WealthsimplePageStatus }
  | {
      type: "wealthsimpleCards";
      cards: Array<{
        id: string;
        nickname: string | null;
        cardNumber: string;
        balance: string;
        creditLimit: number;
      }>;
    }
  | { type: "syncResult"; result: SyncStatus }
  | { type: "error"; message: string; needsReauth?: boolean; needsWealthsimpleReauth?: boolean };
