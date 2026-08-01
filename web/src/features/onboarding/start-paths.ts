export interface StartPath {
  id: "transaction" | "bank" | "receipt"
  glyph: string
  title: string
  body: string
  note: string
  emphasis: boolean
}

export const START_PATHS: readonly StartPath[] = [
  {
    id: "transaction",
    glyph: "＋",
    title: "Add a transaction",
    body: "A salary, a grocery run, an opening balance, an ETF purchase with its fee. Twelve transaction types cover the rest.",
    note: "Opens the ledger, where New transaction opens the editor.",
    emphasis: true,
  },
  {
    id: "bank",
    glyph: "▤",
    title: "Connect a bank",
    body: "Open Banking through TrueLayer, or a read-only Trading 212 key. Imports can arrive for review rather than posting straight in.",
    note: "Opens Settings → Connections.",
    emphasis: false,
  },
  {
    id: "receipt",
    glyph: "◆",
    title: "Snap a receipt",
    body: "Myra reads it and drafts the transaction. You check the details and approve — a good way to see how the ledger fits together.",
    note: "Opens the review queue, where receipts Myra has already read wait for you. Uploading one from the web app is not built yet.",
    emphasis: false,
  },
]
