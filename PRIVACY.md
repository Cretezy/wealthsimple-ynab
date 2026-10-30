# Privacy Policy

_Last updated: October 29, 2026_

This policy covers the **Wealthsimple Credit Card Importer for YNAB** browser extension ("the extension").

## Summary

The extension runs entirely in your browser. It has no backend server, no analytics, and no tracking. The developer never receives any of your data.

## What the extension accesses

| Data                                                                   | Why                                                                         | Where it goes                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Your Wealthsimple session cookie (`my.wealthsimple.com`)               | To read your credit card accounts, balances and transactions on your behalf | Only sent to Wealthsimple's own API (`my.wealthsimple.com`). It is never stored by the extension. |
| Wealthsimple credit card transactions (merchant, amount, date, status) | To create matching transactions in YNAB                                     | Sent directly from your browser to YNAB's official API (`api.ynab.com`)                           |
| Your YNAB access token (OAuth or personal access token)                | To call the YNAB API                                                        | Stored locally in your browser's extension storage. Only sent to `api.ynab.com`.                  |
| Your YNAB plan and account lists                                       | To let you pick where transactions are imported                             | Displayed in the popup. Only the plan and account IDs and names you select are stored locally.    |
| Your preferences (selected card, plan, account, sync options)          | To remember your choices                                                    | Stored locally in your browser's extension storage                                                |

## How data is used

Data is used only to import your Wealthsimple credit card transactions into the YNAB plan you choose, when you click **Sync**. It is not used for any other purpose.

## Third parties

The extension communicates only with:

- **Wealthsimple** (`my.wealthsimple.com`): to read your credit card data
- **YNAB** (`api.ynab.com`, `app.ynab.com`): to authorize and to create or update transactions

No data, including data obtained through the YNAB API, is sold, shared with, or passed to any other third party.

## Storage, security and retention

- YNAB access tokens and preferences are stored in your browser's extension storage (`storage.local`) and never leave your device except in requests to YNAB.
- YNAB OAuth tokens expire after 2 hours.
- Transaction data is held in memory only while a sync runs. It is not persisted by the extension.
- All network requests use HTTPS.

## Deleting your data

The developer does not hold any of your data, so there is nothing to request deletion of. To remove everything the extension has stored:

- Click **Disconnect** in the extension popup to delete your YNAB token and YNAB selections, or
- Uninstall the extension, which removes all of its local storage.

You can also revoke the extension's YNAB access at any time from [YNAB's settings](https://app.ynab.com/settings) under authorized applications. Transactions already imported into YNAB are part of your YNAB plan and are managed in YNAB.

## Changes

If this policy changes, for example to cover a new type of data, the updated policy will be published in this repository with a new "Last updated" date before the change takes effect.

## Contact

Open an issue at <https://github.com/Cretezy/wealthsimple-ynab/issues>, or email charles@cretezy.com.

---

We are not affiliated, associated, or in any way officially connected with YNAB or any of its subsidiaries or affiliates. The official YNAB website can be found at <https://www.ynab.com>. The names YNAB and You Need A Budget, as well as related names, tradenames, marks, trademarks, emblems, and images are registered trademarks of YNAB.

We are not affiliated, associated, or in any way officially connected with Wealthsimple Technologies Inc. or any of its subsidiaries or affiliates. The official Wealthsimple website can be found at <https://www.wealthsimple.com>. The name Wealthsimple, as well as related names, tradenames, marks, trademarks, emblems, and images, are trademarks of their respective owners.
