import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExtensionSettings } from "@/lib/settings";
import type { SyncStatus, WealthsimplePageStatus } from "@/lib/messages";
import type { YnabAccount, YnabBudget } from "@/lib/ynab/types";

// Custom error class so we can carry needsReauth/needsWealthsimpleReauth through TanStack Query's error handling
export class ApiError extends Error {
  needsReauth: boolean;
  needsWealthsimpleReauth: boolean;
  constructor(message: string, needsReauth = false, needsWealthsimpleReauth = false) {
    super(message);
    this.name = "ApiError";
    this.needsReauth = needsReauth;
    this.needsWealthsimpleReauth = needsWealthsimpleReauth;
  }
}

// ── Response types for sendMessage generics ──────────────

type ErrorRes = {
  type: "error";
  message: string;
  needsReauth?: boolean;
  needsWealthsimpleReauth?: boolean;
};
type SettingsRes = { type: "settings"; settings: ExtensionSettings };
type BudgetsRes = { type: "budgets"; budgets: YnabBudget[] };
type AccountsRes = { type: "accounts"; accounts: YnabAccount[] };
type WsStatusRes = { type: "wealthsimpleStatus"; status: WealthsimplePageStatus };
type WsCardsRes = { type: "wealthsimpleCards"; cards: WsCard[] };
type SyncRes = { type: "syncResult"; result: SyncStatus };

// Shared card type
export type WsCard = {
  id: string;
  nickname: string | null;
  cardNumber: string;
  balance: string;
  creditLimit: number;
};

// ── Helpers ─────────────────────────────────────────────

function rejectOnError<T>(res: T | ErrorRes): T {
  if ((res as ErrorRes).type === "error") {
    const err = res as ErrorRes;
    throw new ApiError(err.message, err.needsReauth ?? false, err.needsWealthsimpleReauth ?? false);
  }
  return res as T;
}

// ── Settings ────────────────────────────────────────────

export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await browser.runtime.sendMessage<{ type: "getSettings" }, SettingsRes>({
        type: "getSettings",
      });
      return res.settings;
    },
    staleTime: 60_000,
  });
}

export function useSaveSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["saveSettings"],
    mutationFn: async (settings: Partial<ExtensionSettings>) => {
      const res = await browser.runtime.sendMessage<
        { type: "saveSettings"; settings: Partial<ExtensionSettings> },
        SettingsRes | ErrorRes
      >({ type: "saveSettings", settings });
      return rejectOnError(res).settings;
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["settings"] });
      const previous = queryClient.getQueryData<ExtensionSettings>(["settings"]);
      queryClient.setQueryData<ExtensionSettings>(["settings"], (old) =>
        old ? { ...old, ...newSettings } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["settings"], context.previous);
      }
    },
    onSuccess: (_saved, changes) => {
      if (changes.ynabAccessToken !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["budgets"] });
      }
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: ["saveSettings"] }) === 1) {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    },
  });
}

// ── Budgets ─────────────────────────────────────────────

export function useBudgetsQuery(token?: string) {
  return useQuery({
    queryKey: ["budgets", token],
    queryFn: async () => {
      const res = await browser.runtime.sendMessage<{ type: "listBudgets" }, BudgetsRes | ErrorRes>(
        { type: "listBudgets" },
      );
      return rejectOnError(res).budgets;
    },
    enabled: !!token,
    retry: (_failureCount, error) => !(error instanceof ApiError && error.needsReauth),
  });
}

// ── Accounts ────────────────────────────────────────────

export function useAccountsQuery(budgetId?: string, token?: string) {
  return useQuery({
    queryKey: ["accounts", budgetId, token],
    queryFn: async () => {
      if (!budgetId) throw new ApiError("No budget selected");
      const res = await browser.runtime.sendMessage<
        { type: "listAccounts"; budgetId: string },
        AccountsRes | ErrorRes
      >({ type: "listAccounts", budgetId });
      return rejectOnError(res).accounts.filter((a) => !a.closed && !a.deleted);
    },
    enabled: !!budgetId && !!token,
  });
}

// ── Wealthsimple status ─────────────────────────────────

export function useWealthsimpleStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["wsStatus"],
    queryFn: async () => {
      const res = await browser.runtime.sendMessage<{ type: "getWealthsimpleStatus" }, WsStatusRes>(
        { type: "getWealthsimpleStatus" },
      );
      return res.status;
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── Wealthsimple cards ──────────────────────────────────

export function useWealthsimpleCardsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["wsCards"],
    queryFn: async () => {
      const res = await browser.runtime.sendMessage<
        { type: "listWealthsimpleCards" },
        WsCardsRes | ErrorRes
      >({ type: "listWealthsimpleCards" });
      return rejectOnError(res).cards;
    },
    enabled,
    staleTime: 30_000,
    // A 401 won't recover by retrying — the user must re-open Wealthsimple first.
    retry: (_failureCount, error) => !(error instanceof ApiError && error.needsWealthsimpleReauth),
  });
}

// ── Sync ────────────────────────────────────────────────

export function useSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { config: ExtensionSettings; dryRun?: boolean }) => {
      const res = await browser.runtime.sendMessage<
        { type: "syncNow"; config: ExtensionSettings; dryRun?: boolean },
        SyncRes | ErrorRes
      >({ type: "syncNow", config: opts.config, dryRun: opts.dryRun });
      return rejectOnError(res).result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    },
  });
}

// ── Auth ────────────────────────────────────────────────

export function useAuthorizeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await browser.runtime.sendMessage<
        { type: "authorizeYnab" },
        SettingsRes | ErrorRes
      >({ type: "authorizeYnab" });
      return rejectOnError(res).settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useRevokeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await browser.runtime.sendMessage<{ type: "revokeYnab" }, SettingsRes>({
        type: "revokeYnab",
      });
      return res.settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      queryClient.removeQueries({ queryKey: ["budgets"] });
      queryClient.removeQueries({ queryKey: ["accounts"] });
      queryClient.removeQueries({ queryKey: ["wsStatus"] });
      queryClient.removeQueries({ queryKey: ["wsCards"] });
    },
  });
}
