export {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  CATEGORY_PLACEHOLDER,
  CATEGORY_REQUIRED,
  DATE_HINT,
  DATE_LABEL,
  DATE_PLACEHOLDER,
  DATE_REQUIRED,
  DATE_UNREADABLE,
  DESCRIPTION_HINT,
  DESCRIPTION_LABEL,
  DESCRIPTION_PLACEHOLDER,
  DESCRIPTION_REQUIRED,
  DESCRIPTION_TOO_LONG,
} from "../grouping/copy"

export const GROUP_EDITOR_EYEBROW = "Group"
export const GROUP_EDITOR_TITLE = "Edit group"

export const GROUP_EDITOR_INTRO =
  "Only the group's own description, date and category are edited here. The transactions inside it are sent back untouched — they keep their amounts, accounts, dates and categories."

export const GROUP_DESCRIPTION_MAX = 500

export const SAVE_GROUP = "Save group"
export const SAVING_GROUP = "Saving…"
export const CANCEL = "Cancel"

export const GROUP_UNSAVED_TITLE = "Unsaved changes."
export const GROUP_UNSAVED_BODY =
  "Closing now discards what you typed. The group itself is untouched."
export const GROUP_UNSAVED_DISCARD = "Discard"
export const GROUP_UNSAVED_KEEP = "Keep editing"

export const GROUP_EDITOR_MEMBERS_LABEL = "Transactions in this group"

export function groupMembersHeldNote(count: number): string {
  return count === 1
    ? "1 transaction is in this group. Saving sends it back exactly as it is."
    : `${String(count)} transactions are in this group. Saving sends them back exactly as they are.`
}

export function groupRejectedSummary(count: number): string {
  return count === 1
    ? "One field needs fixing before this group can be saved."
    : `${String(count)} fields need fixing before this group can be saved.`
}
