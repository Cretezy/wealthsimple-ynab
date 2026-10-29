import { WealthsimpleClient, type WealthsimpleAuth } from "../wealthsimple/client";
import type { WealthsimpleActivity } from "../wealthsimple/types";
import {
  isSupportedActivity,
  mapWealthsimpleActivityToYnab,
  toClearedUpdate,
} from "../ynab/mapper";
import { YnabClient } from "../ynab/client";
import type { YnabTransactionPayload } from "../ynab/types";
import { parseLocalDate } from "../date";

export type SyncConfig = {
  wealthsimpleAccountId: string;
  wealthsimpleAuth: WealthsimpleAuth;
  ynabAccessToken: string;
  ynabBudgetId: string;
  ynabAccountId: string;
  includePending: boolean;
  approveImported: boolean;
  includeMemo: boolean;
  since: string;
};

export type SyncResult = {
  fetched: number;
  supported: number;
  created: number;
  duplicates: number;
  updated: number;
  transactions: YnabTransactionPayload[];
  duplicateImportIds: string[];
};

export async function buildYnabTransactions(
  activities: WealthsimpleActivity[],
  config: SyncConfig,
): Promise<YnabTransactionPayload[]> {
  const supported = activities.filter((activity) =>
    isSupportedActivity(activity, {
      accountId: config.wealthsimpleAccountId,
      includePending: config.includePending,
    }),
  );

  return Promise.all(
    supported.map((activity) =>
      mapWealthsimpleActivityToYnab(activity, {
        ynabAccountId: config.ynabAccountId,
        approveImported: config.approveImported,
        includeMemo: config.includeMemo,
      }),
    ),
  );
}

export async function syncTransactions(
  config: SyncConfig,
  options?: {
    dryRun?: boolean;
    since?: Date;
    now?: Date;
  },
): Promise<SyncResult> {
  const now = options?.now ?? new Date();
  const startDate = options?.since ?? parseLocalDate(config.since);
  const dryRun = options?.dryRun ?? false;

  const wealthsimpleClient = new WealthsimpleClient(
    config.wealthsimpleAccountId,
    config.wealthsimpleAuth,
  );
  const ynabClient = new YnabClient(
    config.ynabAccessToken,
    config.ynabBudgetId,
    config.ynabAccountId,
  );

  const activities = await wealthsimpleClient.fetchCreditCardActivity({
    endDate: now,
    startDate,
  });
  const transactions = await buildYnabTransactions(activities, config);
  const updates = transactions.map(toClearedUpdate);

  if (dryRun) {
    return {
      fetched: activities.length,
      supported: transactions.length,
      created: 0,
      duplicates: 0,
      updated: 0,
      transactions,
      duplicateImportIds: [],
    };
  }

  const created = await ynabClient.createTransactions(transactions);
  await ynabClient.updateCleared(updates);

  return {
    fetched: activities.length,
    supported: transactions.length,
    created: created.transactionIds.length,
    duplicates: created.duplicateImportIds.length,
    updated: created.duplicateImportIds.length,
    transactions,
    duplicateImportIds: created.duplicateImportIds ?? [],
  };
}
