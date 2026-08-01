export const MYRA_EYEBROW = "Assistant"

export const MYRA_TITLE = "Myra"

export const MYRA_SUBTITLE =
  "Myra reads your ledger and proposes. Nothing is written until you approve it."

export const EMPTY_HEADLINE = "Ask Myra about your money"

export const EMPTY_BODY =
  "Myra answers from the same ledger the rest of Sverto reads, and shows the tool calls behind every figure."

export const SUGGESTIONS: readonly string[] = [
  "How much did I spend by category last month?",
  "What are my largest holdings?",
  "How has my net worth moved this year?",
  "Show me every transaction over the last week",
  "What did I pay in fees?",
]

export const COMPOSER_PLACEHOLDER = "Ask about your money…"

export const COMPOSER_FOOT =
  "Myra can be wrong. Every figure states the tool that produced it, and every write asks you first."

export const SEND = "Send"

export const STOP = "Stop"

export const NEW_CHAT = "New chat"

export const CONVERSATIONS_EMPTY = "No chats yet."

export const CONVERSATIONS_FOOT =
  "Only your 50 most recent chats are listed — older ones are not shown here."

export const CONVERSATIONS_ERROR = "Your chats could not be loaded."

export const UNTITLED_CONVERSATION = "Untitled chat"

export const QUOTA_UNAVAILABLE = "Usage unknown"

export const QUOTA_NOTE =
  "Hourly and monthly use, read when the page loaded. It does not move while Myra is answering."

export const SHOW_WORK = "Show work"

export const HIDE_WORK = "Hide"

export const SHOW_RAW = "Raw"

export const HIDE_RAW = "Hide raw"

export const WORK_PARAMETERS = "Parameters"

export const WORK_RESULT = "Result"

export const WORK_RAW_FOOT =
  "Exactly what Myra sent and exactly what came back — no rounding, no reshaping."

export const WORK_RUNNING = "Working…"

export const REFINE_LABEL = "Refine"

export const REFINE_NOTE =
  "A refinement asks the same question with one thing changed. It sends a new message; it does not edit this answer."

export const OPEN_IN_LEDGER = "Open these →"

export const COPY_ANSWER = "Copy answer"

export const COPY_ANSWER_TABLE = "Copy these figures"

export const JUMP_TO_LATEST = "Jump to latest"

export const PIN = "Pin"

export const UNPIN = "Unpin"

export const PINNED_LABEL = "Pinned"

export const PINS_NOTE =
  "Pins last for this visit. Sverto has no way to find a pinned answer again later, so a pin cannot survive a reload."

export const PIN_COMPARE_REFUSAL =
  "These two answers are not in the same unit, so there is no difference to state."

export const APPROVAL_HEADLINE = "Your approval is needed"

export const APPROVAL_INTRO =
  "Myra wants to write this. Nothing has been saved yet."

export const APPROVE = "Approve"

export const DENY = "Deny"

export const APPROVAL_FOOT =
  "Approving writes exactly what Myra proposed to your ledger; denying tells Myra it was refused."

export const APPROVAL_NET_EFFECT_REFUSAL =
  "The net effect on net worth is not shown: Sverto cannot value a proposed transaction in your base currency before it is written."

export const DENIED_LABEL = "Denied"

export const DENIED_RECEIPT = "You denied this. Nothing was written."

export const APPROVED_LABEL = "Approved"

export const RETRY = "Retry"

export const STREAM_FAILED = "This answer stopped before it finished."

export const RATE_LIMITED_UNTIL = "Try again after"

export const CONTEXT_SUFFIX = (page: string) => `(Asked from the ${page} page.)`

export const ASKED_FROM = (page: string) => `Asked from ${page}`

export const REASONING_LABEL = "Thinking"

export const TRANSCRIPT_LABEL = "Conversation with Myra"

export const HISTORY_ERROR = "This chat could not be loaded."

export const INTERRUPTED =
  "This answer was interrupted before it completed. Retry picks it up where it stopped."

export const NATIVE_AMOUNT_FOOTNOTE =
  "Amounts are in each asset's own units. Sverto never converts a transaction into your base currency, so these are not added up."

export const NOTHING_MATCHED = "Nothing matched"

export const LEDGER_PARTIAL_NOTE = (unapplied: readonly string[]) =>
  `The ledger cannot narrow by ${unapplied.join(" or ")} yet. It opens on what it can apply and shows the rest struck through.`
