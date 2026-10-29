import { localDateDaysAgo } from "./date";

export type ExtensionSettings = {
  ynabAccessToken: string;
  ynabBudgetId: string;
  ynabBudgetName: string;
  ynabAccountId: string;
  ynabAccountName: string;
  wealthsimpleAccountId: string;
  includePending: boolean;
  approveImported: boolean;
  includeMemo: boolean;
  since: string;
  /** Legacy setting used only when migrating older stored settings. */
  lookbackDays?: number;
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  ynabAccessToken: "",
  ynabBudgetId: "default",
  ynabBudgetName: "",
  ynabAccountId: "",
  ynabAccountName: "",
  wealthsimpleAccountId: "",
  includePending: true,
  approveImported: false,
  includeMemo: true,
  since: localDateDaysAgo(45),
};
