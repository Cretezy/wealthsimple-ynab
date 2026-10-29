export type YnabCleared = "cleared" | "uncleared";

export type YnabTransactionPayload = {
  account_id: string;
  date: string;
  amount: number;
  payee_name: string;
  memo: string;
  cleared: YnabCleared;
  approved: boolean;
  import_id: string;
};

export type YnabTransactionUpdatePayload = {
  account_id: string;
  date?: string;
  amount?: number;
  payee_name?: string;
  memo?: string;
  cleared: YnabCleared;
  approved?: boolean;
  import_id: string;
  /** Must be explicitly null so the API uses import_id for lookup. */
  id: null;
};

export type YnabCreateSummary = {
  transactionIds: string[];
  duplicateImportIds: string[];
};

export type YnabBudget = {
  id: string;
  name: string;
};

export type YnabAccount = {
  id: string;
  name: string;
  type: string;
  closed: boolean;
  deleted: boolean;
};
