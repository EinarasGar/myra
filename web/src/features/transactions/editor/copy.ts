export const NEW_TRANSACTION = "New transaction"
export const CHOOSER_TITLE = "New transaction"
export const CHOOSER_EYEBROW = "Editor"
export const CHOOSER_FILTER_PLACEHOLDER =
  "Type to filter — “div”, “sell”, “transfer”…"
export const CHOOSER_FOOTER = "Pick a type to start."
export const CHOOSER_EMPTY = "No type matches that."
export const CHOOSER_KEEPS_INPUT =
  "Changing type keeps everything you have already typed."

export const CHANGE_TYPE = "Change type"

export const SAVE_CREATE = "Save transaction"
export const SAVE_EDIT = "Save changes"
export const SAVE_AND_NEW = "Save and add another"
export const CANCEL = "Cancel"

export const SAVING = "Saving…"

export const AMOUNT_MOVED = "Amount moved"

export const DATE_HINT = "plain English works"
export const DATE_UNPARSED =
  "Not a date Sverto recognises. Try “yesterday”, “3 days ago” or 2026-07-24."

export const DESCRIPTION_HINT =
  "Only a purchase stores a description. Every other type has its description written from its entries."

export const CATEGORY_HINT =
  "Only a purchase carries a category. The other twelve types take theirs from the entry."

export const FEES_TITLE = "Fees"
export const FEES_ADD = "Add a fee"
export const FEES_EMPTY = "No fees on this transaction."
export const FEES_NOTE =
  "A fee is its own entry: it leaves the account you name, in the asset you name."

export function unsavedFieldSummary(count: number): string {
  const fields = count === 1 ? "One field" : `${String(count)} fields`
  return `${fields} still need${count === 1 ? "s" : ""} an answer. Nothing has been saved.`
}

export const UNSAVED_TITLE = "Discard this transaction?"
export const UNSAVED_BODY =
  "Nothing has been saved. Closing loses what you typed."
export const UNSAVED_DISCARD = "Discard"
export const UNSAVED_KEEP = "Keep editing"

export const CREATED_TITLE = "Transaction saved"
export const UNDO = "Undo"
export const CREATE_UNDONE_TITLE = "Transaction removed"
export const CREATE_UNDONE_BODY =
  "The transaction Sverto had just saved has been deleted again."
export const UPDATED_TITLE = "Changes saved"
export const UPDATE_UNDO_UNAVAILABLE =
  "Editing overwrites the transaction in place and the previous version is not kept, so this cannot be undone."

export const CORRECTIONS_TITLE = "Tell Myra what to change"
export const PROPOSAL_EYEBROW = "Myra proposal"
export const PROPOSAL_FILLED_LABEL = "Filled by Myra"
export const PROPOSAL_CORRECTED_LABEL = "edited"

export const LOADING_TRANSACTION = "Loading this transaction"

export function correctionCount(count: number): string {
  return count === 1 ? "1 correction" : `${String(count)} corrections`
}

export function previousValueNote(label: string | null): string {
  return label === null ? "changed from Myra's answer" : `was ${label}`
}
