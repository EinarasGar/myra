export const GROUP_EYEBROW = "Group"

export const CREATE_TITLE = "New group"
export const ADD_TITLE = "Add to group"

export const CREATE_INTRO =
  "A group folds several transactions that already exist into one ledger row — a split receipt, or the legs of one purchase. Nothing is merged: the transactions keep their own amounts, accounts and dates, and every balance they feed is unchanged."

export const ADD_INTRO =
  "The transactions you pick move out of the ledger and under this group. They keep their own amounts and dates, and the group's own description, date and category are what the ledger row shows."

export const DESCRIPTION_LABEL = "Description"
export const DESCRIPTION_PLACEHOLDER = "What this group is"
export const DESCRIPTION_HINT =
  "This is the line the ledger shows for the whole group."

export const DATE_LABEL = "Date"
export const DATE_PLACEHOLDER = "today, 3 days ago, 2026-07-14"
export const DATE_HINT =
  "The group's own date, which is what it files under in the ledger. Its transactions keep theirs."

export const CATEGORY_LABEL = "Category"
export const CATEGORY_PLACEHOLDER = "Pick a category"
export const CATEGORY_HINT =
  "A group always carries one, even when the transactions inside it carry none."

export const MEMBERS_LABEL = "Transactions"
export const MEMBER_PICKER_PLACEHOLDER = "Search your ungrouped transactions…"
export const MEMBER_PICKER_EMPTY =
  "No ungrouped transaction matches that. A transaction already in a group has to leave it first."
export const MEMBER_PICKER_HINT =
  "Only transactions that are not already in a group can be added."

export const GROUP_PICKER_LABEL = "Group"
export const GROUP_PICKER_PLACEHOLDER = "Search your groups…"
export const GROUP_PICKER_EMPTY = "No group matches that."

export const MEMBERS_EMPTY = "Nothing picked yet."

export const REMOVE_MEMBER = "Remove from this group"

export const SAVE_CREATE = "Create group"
export const SAVE_ADD = "Add to group"
export const SAVING = "Saving…"
export const CANCEL = "Cancel"

export const DESCRIPTION_REQUIRED = "A group needs a description."
export const DESCRIPTION_TOO_LONG = "Keep this under 500 characters."
export const DATE_REQUIRED = "A group needs a date."
export const DATE_UNREADABLE =
  "This date could not be read. Try today, 3 days ago, or 2026-07-14."
export const CATEGORY_REQUIRED = "A group needs a category."
export const MEMBERS_TOO_FEW =
  "Pick at least two transactions — a group of one is just the transaction."
export const MEMBERS_NONE_ADDED = "Pick at least one transaction to add."

export function membersNote(count: number, mode: "create" | "add"): string {
  if (mode === "add") {
    return count === 1
      ? "1 transaction joins this group, so the ledger loses one row and keeps every transaction."
      : `${String(count)} transactions join this group, so the ledger loses ${String(count)} rows and keeps every transaction.`
  }
  return count < 2
    ? "A group is one ledger row holding several transactions."
    : `${String(count)} transactions become 1 ledger row. Day nets and counts are unchanged — a group counts as one row but ${String(count)} transactions.`
}

export function existingMembersNote(count: number): string {
  return count === 1
    ? "1 transaction is already in this group and stays where it is."
    : `${String(count)} transactions are already in this group and stay where they are.`
}
