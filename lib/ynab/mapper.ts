import type { WealthsimpleActivity } from "../wealthsimple/types";
import { wealthsimpleImportId } from "../sync/import-id";
import type { YnabCleared, YnabTransactionPayload, YnabTransactionUpdatePayload } from "./types";

export function wealthsimpleAmountToMilliunits(
  amount: string,
  amountSign: "negative" | "positive",
): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (match === null) {
    throw new Error(`Unsupported money amount: ${amount}`);
  }

  const dollars = Number.parseInt(match[1] ?? "0", 10);
  const cents = Number.parseInt((match[2] ?? "").padEnd(2, "0"), 10);
  const milliunits = dollars * 1000 + cents * 10;

  return amountSign === "negative" ? -milliunits : milliunits;
}

export function isSettled(activity: Pick<WealthsimpleActivity, "unifiedStatus">): boolean {
  return activity.unifiedStatus === "COMPLETED";
}

export function isPending(activity: Pick<WealthsimpleActivity, "unifiedStatus">): boolean {
  return activity.unifiedStatus === "PENDING";
}

export function clearedState(activity: Pick<WealthsimpleActivity, "unifiedStatus">): YnabCleared {
  return isSettled(activity) ? "cleared" : "uncleared";
}

export function isSupportedActivity(
  activity: WealthsimpleActivity,
  options: {
    accountId: string;
    includePending: boolean;
  },
): boolean {
  if (
    activity.type !== "CREDIT_CARD" ||
    activity.accountId !== options.accountId ||
    activity.currency !== "CAD"
  ) {
    return false;
  }

  return isSettled(activity) || (options.includePending && isPending(activity));
}

export async function mapWealthsimpleActivityToYnab(
  activity: WealthsimpleActivity,
  options: {
    ynabAccountId: string;
    approveImported: boolean;
    includeMemo: boolean;
  },
): Promise<YnabTransactionPayload> {
  return {
    account_id: options.ynabAccountId,
    date: toLocalDate(activity.occurredAt),
    amount: wealthsimpleAmountToMilliunits(activity.amount, activity.amountSign),
    payee_name: activity.spendMerchant ?? fallbackPayee(activity),
    memo: options.includeMemo ? "Imported by extension" : "",
    cleared: clearedState(activity),
    approved: options.approveImported,
    import_id: await wealthsimpleImportId(activity.canonicalId),
  };
}

export function toClearedUpdate(transaction: YnabTransactionPayload): YnabTransactionUpdatePayload {
  // Only update cleared status — leave payee/date/amount alone
  return {
    account_id: transaction.account_id,
    cleared: transaction.cleared,
    import_id: transaction.import_id,
    id: null,
  };
}

function fallbackPayee(activity: WealthsimpleActivity): string {
  if (activity.subType === "PAYMENT") return "Wealthsimple Credit Card Payment";
  return "Wealthsimple Credit Card";
}

function toLocalDate(isoDateTime: string): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(isoDateTime).toLocaleDateString("en-CA", {
    timeZone,
  });
}
