export const BASE_CURRENCY_CONSEQUENCE =
  "Accounts keep their own currencies. This only changes the currency your totals are converted into — switch back any time and every figure returns exactly as it was."

export const BASE_CURRENCY_RATE_SCOPE =
  "Rates are fetched one currency at a time, for the currencies listed here only."

export const BASE_CURRENCY_NO_RATE =
  "No rate path to your base currency, so this one cannot be priced yet."

export const THEME_CONSEQUENCE =
  "Applies on this device only. System follows your operating system until you pick Light or Dark."

export const SIGN_OUT_CONSEQUENCE =
  "Ends this session on this device. Nothing in your ledger changes."

export const NOAUTH_CONSEQUENCE =
  "This build runs with authentication disabled, so there is no session to end and no password to change."

export const ACCOUNT_DANGER_TITLE = "Delete your account"

export const ACCOUNT_DANGER_BODY =
  "Permanently erases your account and every piece of data tied to it — accounts, transactions and entries, custom assets and their history, your own categories, AI chats, connections and uploaded files. This cannot be undone and there is no export first."

export const ACCOUNT_DANGER_SURVIVES =
  "Shared data that every Sverto install relies on stays put — global assets, exchange-rate history and the seeded categories and types are never touched."

export const DELETE_ACCOUNT_CONFIRM = "Delete my account"

export const CATEGORY_COUNT_SCOPE =
  "Counts are how many categories sit in each type. Sverto cannot yet say how many transactions use a category."

export const CATEGORY_DELETE_CONSEQUENCE =
  "Deleting a category leaves its transactions in place with no category. The transactions are not touched and nothing is removed from your ledger."

export const CATEGORY_TYPE_DELETE_CONSEQUENCE =
  "A type cannot be deleted while categories still sit in it. Empty it first, then delete the type."

export const CATEGORY_ICON_HINT =
  "Shown beside this category everywhere it appears — in the ledger, in pickers and on this page. It changes nothing about how the category behaves."

export const CATEGORY_GLOBAL_NOTE =
  "Seeded categories and types are shared by every Sverto install and cannot be renamed or removed. Yours can."

export const CUSTOM_ASSET_CONSEQUENCE =
  "A custom asset holds whatever rate you last entered until you add another — old valuations stay in the series, so historical net worth does not silently change."

export const CUSTOM_ASSET_UNPRICED =
  "No rate against your base currency yet, so this asset counts as nothing in every total."

export const CONNECTIONS_READ_ONLY =
  "Sverto only ever reads. No connection here can move money, and every provider can be revoked from this page or from your bank."

export const CONNECTION_IMPORT_TOTAL_UNAVAILABLE =
  "Sverto does not keep a running count of what a connection has imported — each sync reports only its own run."

export const CONSENT_CONSEQUENCE =
  "Open Banking consent expires on its own. Imports simply stop when it lapses; nothing already imported is deleted."

export const BINDING_UNBOUND_CONSEQUENCE =
  "Unbound provider accounts are ignored completely — Sverto fetches nothing for them."

export const TRUSTED_WRITES_ON =
  "On — imports post straight into your ledger and change your balances without review."

export const TRUSTED_WRITES_OFF =
  "Off — imports arrive unreviewed and wait for you in Review."

export const PAUSE_CONSEQUENCE =
  "Pausing stops new imports for this account only. Transactions already imported stay exactly as they are."

export const RESUME_CONSEQUENCE =
  "Imports are paused for this account. Resuming picks up from the last sync — nothing in between is skipped."

export const REMOVE_BINDING_TITLE = "Unbind this account"

export const REMOVE_BINDING_BODY =
  "Stops all imports into this account and forgets where the provider account was mapped. Transactions already imported stay in your ledger and keep their reviewed status. You can bind the same pair again later; syncing then starts from scratch."

export const REVOKE_CONNECTION_TITLE = "Revoke this connection"

export const REVOKE_CONNECTION_BODY =
  "Removes Sverto's access at the provider and stops all imports immediately. Every binding on this connection is deleted. Transactions already imported stay in your ledger and keep their reviewed status. Reconnecting later starts a fresh consent."

export const QUOTA_CONSEQUENCE =
  "When a window runs out, chat pauses until it resets — nothing is lost, and any proposal you have not approved stays in the conversation."

export const MYRA_APPROVAL_CONSEQUENCE =
  "Myra proposes; you approve or deny. This is structural and cannot be switched off."

export const MYRA_PERMISSION_UNSTORED =
  "Sverto cannot save this preference yet, so this switch has nowhere to save to. It is shown fixed rather than made to look like a setting that sticks."

export const CONNECT_OAUTH_CONSEQUENCE =
  "Sends you to the provider to approve read-only access. You come back here when they are done."

export const CONNECT_KEY_CONSEQUENCE =
  "The key is stored with your Sverto data, not on this device. Use a read-only key — Sverto never needs more."
