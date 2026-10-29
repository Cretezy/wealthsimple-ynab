import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifestVersion: 3,
  zip: {
    // Firefox source-review zip only needs what is required to build
    excludeSources: ["store-assets/**"],
  },
  manifest: ({ browser }) => ({
    // YNAB API terms: the name may only mention YNAB when preceded by "for".
    name: "Wealthsimple Credit Card Importer for YNAB",
    description: "Sync Wealthsimple credit card activity into YNAB",
    homepage_url: "https://github.com/Cretezy/wealthsimple-ynab",
    permissions: ["storage", "cookies", "identity"],
    host_permissions: ["https://my.wealthsimple.com/*", "https://api.ynab.com/*"],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "wealthsimple-ynab@cretezy.com",
              // data_collection_permissions requires Firefox 140+
              strict_min_version: "140.0",
              // Transactions leave the device (sent to the user's YNAB budget)
              data_collection_permissions: {
                required: ["financialAndPaymentInfo", "authenticationInfo"],
              },
            },
            gecko_android: { strict_min_version: "142.0" },
          },
        }
      : {}),
  }),
});
