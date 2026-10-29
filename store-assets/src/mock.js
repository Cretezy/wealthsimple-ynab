// Mock extension APIs so the built popup renders with fake data outside the extension.
// Screen is chosen with ?state=dashboard|connect|preview|result
(() => {
  const state = new URLSearchParams(location.search).get("state") ?? "dashboard";

  const settings = {
    ynabAccessToken: state === "connect" ? "" : "mock-token",
    ynabBudgetId: "budget-1",
    ynabBudgetName: "My Budget",
    ynabAccountId: "account-1",
    ynabAccountName: "Wealthsimple Visa",
    wealthsimpleAccountId: "card-1",
    includePending: true,
    approveImported: false,
    includeMemo: true,
    since: "2026-09-15",
  };

  const budgets = [
    { id: "budget-1", name: "My Budget" },
    { id: "budget-2", name: "Shared Household" },
  ];
  const accounts = [
    {
      id: "account-1",
      name: "Wealthsimple Visa",
      type: "creditCard",
      closed: false,
      deleted: false,
    },
    { id: "account-2", name: "Chequing", type: "checking", closed: false, deleted: false },
  ];
  const cards = [
    {
      id: "card-1",
      nickname: "Wealthsimple Visa",
      cardNumber: "4821",
      balance: "1284.37",
      creditLimit: 5000,
    },
  ];

  const txs = [
    ["2026-10-28", "Loblaws", -87420, "uncleared"],
    ["2026-10-27", "Tim Hortons", -6350, "uncleared"],
    ["2026-10-26", "Presto", -20000, "cleared"],
    ["2026-10-25", "Shoppers Drug Mart", -23180, "cleared"],
    ["2026-10-24", "Netflix", -18990, "cleared"],
    ["2026-10-23", "Uber Eats", -34610, "cleared"],
    ["2026-10-22", "Petro-Canada", -61250, "cleared"],
    ["2026-10-21", "Cashback", 4120, "cleared"],
    ["2026-10-20", "Metro", -52880, "cleared"],
  ].map(([date, payee_name, amount, cleared], i) => ({
    account_id: "account-1",
    date,
    amount,
    payee_name,
    memo: "",
    cleared,
    approved: false,
    import_id: `WS:${i}`,
  }));

  const syncResult = (dryRun) => ({
    lastSyncAt: Date.now(),
    lastResult: {
      fetched: txs.length,
      supported: txs.length,
      created: dryRun ? 0 : 6,
      duplicates: dryRun ? 0 : 3,
      updated: dryRun ? 0 : 3,
      transactions: txs,
      duplicateImportIds: dryRun ? [] : ["WS:6", "WS:7", "WS:8"],
    },
    inProgress: false,
    error: null,
  });

  async function handle(msg) {
    switch (msg.type) {
      case "getSettings":
        return { type: "settings", settings };
      case "saveSettings":
        Object.assign(settings, msg.settings);
        return { type: "settings", settings };
      case "listBudgets":
        return { type: "budgets", budgets };
      case "listAccounts":
        return { type: "accounts", accounts };
      case "getWealthsimpleStatus":
        return {
          type: "wealthsimpleStatus",
          status: { onAccountPage: true, accountId: "card-1", signedIn: true },
        };
      case "listWealthsimpleCards":
        return { type: "wealthsimpleCards", cards };
      case "syncNow":
        return { type: "syncResult", result: syncResult(!!msg.dryRun) };
      default:
        return { type: "settings", settings };
    }
  }

  const api = {
    runtime: { id: "mock", sendMessage: handle, getURL: (p) => p, onMessage: { addListener() {} } },
    storage: {
      local: { get: async () => ({}), set: async () => {} },
      onChanged: { addListener() {} },
    },
  };
  globalThis.browser = api;
  globalThis.chrome = api;

  // Drive the UI into the requested screen.
  const clickLabel = { preview: "Preview import", result: "Sync Now" }[state];
  const done = () => document.documentElement.setAttribute("data-ready", "1");
  if (!clickLabel) {
    const t = setInterval(() => {
      if (document.querySelector(".popup button")) {
        clearInterval(t);
        setTimeout(done, 200);
      }
    }, 50);
    return;
  }
  const t = setInterval(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes(clickLabel),
    );
    if (btn && !btn.disabled) {
      clearInterval(t);
      btn.click();
      const w = setInterval(() => {
        if (document.querySelector(".dry-run-item")) {
          clearInterval(w);
          setTimeout(done, 200);
        }
      }, 50);
    }
  }, 50);
})();
