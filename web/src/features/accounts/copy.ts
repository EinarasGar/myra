export const NEW_ACCOUNT = "New account"
export const EDIT_ACCOUNT = "Edit account"
export const DEACTIVATE_ACCOUNT = "Deactivate account"

export const ACCOUNT_EDITOR_CREATE_TITLE = "New account"
export const ACCOUNT_EDITOR_EYEBROW = "Account"

export const NAME_LABEL = "Name"
export const NAME_HINT =
  "What you call it, not what the bank calls it. It shows on every row, chart and picker."

export const TYPE_LABEL = "Account type"
export const TYPE_HINT =
  "The type decides which group the account is listed under and whether it counts as spendable today. Sverto reads it; it does not store a group."

export const LIQUIDITY_LABEL = "Liquidity"
export const LIQUIDITY_HINT =
  "Only one liquidity type is seeded, so this rarely changes anything today. Create and edit both require it."

export const SHARE_LABEL = "Your share"
export const SHARE_WHOLE = "The whole account is yours."
export const SHARE_ALL_MINE = "All mine"
export const SHARE_HALF = "Half"

export function sharedConsequence(percent: number): string {
  return `Sverto counts ${formatSharePercentLabel(percent)} of every balance in this account toward your net worth. The rest belongs to whoever you share it with.`
}

export function formatSharePercentLabel(percent: number): string {
  return `${String(Number(percent.toFixed(4)))}%`
}

export const IDENTIFIERS_LABEL = "Identifiers"
export const IDENTIFIERS_HINT =
  "How an imported transaction finds its way to this account. Stored encrypted, masked until you reveal them, and optional — an account works without any."
export const IDENTIFIERS_EMPTY = "No identifiers yet."
export const ADD_IDENTIFIER = "Add identifier"
export const REMOVE_IDENTIFIER = "Remove"

export const SAVE_CREATE = "Add account"
export const SAVE_EDIT = "Save changes"
export const SAVING = "Saving…"
export const CANCEL = "Cancel"

export const CREATED_TITLE = "Account added"
export const UPDATED_TITLE = "Account saved"
export const DEACTIVATED_TITLE = "Account deactivated"
export const UNDO = "Undo"
export const CREATE_UNDONE_TITLE = "Account removed again"
export const CREATE_UNDONE_BODY =
  "The account you just added has been deactivated. Nothing else changed."
export const UPDATE_UNDONE_TITLE = "Change reverted"
export const UPDATE_UNDONE_BODY = "The account is back to how it was."

export const DEACTIVATE_TITLE_PREFIX = "Deactivate"
export const DEACTIVATE_LOST =
  "It disappears from the accounts list, from every picker and from the balance and net-worth totals, so those figures drop by whatever it held. Imports bound to it stop."
export const DEACTIVATE_SURVIVES =
  "Its transactions stay in the ledger exactly as they are, with their categories, groups and reviewed status. Nothing is deleted — but only an administrator can bring the account back."
export const DEACTIVATE_CONFIRM = "Deactivate"
export const DEACTIVATE_KEEP = "Keep it"

export const REFERENCE_ERROR_HEADLINE = "Account types could not be loaded"
export const REFERENCE_ERROR_BODY =
  "The account type and liquidity lists could not be loaded, and the form needs both before it can save. Nothing you typed has been lost."
export const RETRY = "Try again"

export const SETTINGS_ACCOUNTS_EMPTY_HEADLINE = "No accounts yet"
export const SETTINGS_ACCOUNTS_EMPTY_BODY =
  "An account is where a balance lives — a current account, a broker, a mortgage. Add one and its transactions start rolling up into your net worth."
export const SETTINGS_ACCOUNTS_FOOTNOTE =
  "This list shows active accounts only. Deactivating one leaves its transactions in the ledger and takes its balance out of every total."
