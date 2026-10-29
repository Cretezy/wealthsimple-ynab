import * as ynab from "ynab";
import type {
  YnabAccount,
  YnabBudget,
  YnabCreateSummary,
  YnabTransactionPayload,
  YnabTransactionUpdatePayload,
} from "./types";

export class YnabClient {
  private readonly api: ynab.API;
  private readonly budgetId: string;
  private readonly accountId: string;

  constructor(accessToken: string, budgetId: string, accountId: string) {
    this.api = new ynab.API(accessToken);
    this.budgetId = budgetId;
    this.accountId = accountId;
  }

  async listBudgets(): Promise<YnabBudget[]> {
    const response = await this.api.plans.getPlans();
    return response.data.plans.map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));
  }

  async listAccounts(): Promise<YnabAccount[]> {
    const response = await this.api.accounts.getAccounts(this.budgetId);
    return response.data.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type ?? "",
      closed: a.closed,
      deleted: a.deleted,
    }));
  }

  async createTransactions(transactions: YnabTransactionPayload[]): Promise<YnabCreateSummary> {
    if (transactions.length === 0) {
      return { transactionIds: [], duplicateImportIds: [] };
    }

    const response = await this.api.transactions.createTransactions(this.budgetId, {
      transactions,
    });

    return {
      transactionIds: response.data.transaction_ids ?? [],
      duplicateImportIds: response.data.duplicate_import_ids ?? [],
    };
  }

  async updateCleared(transactions: YnabTransactionUpdatePayload[]): Promise<void> {
    if (transactions.length === 0) return;

    await this.api.transactions.updateTransactions(this.budgetId, {
      transactions,
    });
  }

  get configuredAccountId(): string {
    return this.accountId;
  }
}
