import {
  countOf,
  formatFigure,
  formatMoney,
  pluralise,
  type SignDisplay,
} from "@/lib/format"
import { LEDGER_FILTER_SUPPORT } from "@/features/transactions/api"

import {
  LEDGER_PARTIAL_NOTE,
  NATIVE_AMOUNT_FOOTNOTE,
  NOTHING_MATCHED,
} from "../copy"
import type { ToolPart } from "./types"

export type AnswerFigureKind = "money" | "units" | "plain"

export interface AnswerFigure {
  readonly value: number | null
  readonly kind: AnswerFigureKind
  readonly currency?: string
  readonly ticker?: string
  readonly signed: boolean
}

export interface AnswerRow {
  readonly key: string
  readonly label: string
  readonly meta: string | null
  readonly count: number | null
  readonly figure: AnswerFigure
}

export interface AnswerRefinement {
  readonly id: string
  readonly label: string
  readonly prompt: string
}

export interface AnswerLedgerSearch {
  readonly q?: string
  readonly account?: string
  readonly from?: string
  readonly to?: string
}

export interface AnswerLedgerLink {
  readonly search: AnswerLedgerSearch
  readonly unapplied: readonly string[]
}

export interface AnswerProvenance {
  readonly tool: string
  readonly facts: readonly string[]
  readonly at: number
}

export interface AnswerCard {
  readonly id: string
  readonly tool: string
  readonly label: string
  readonly headline: AnswerFigure | null
  readonly headlineNote: string
  readonly countLabel: string | null
  readonly rows: readonly AnswerRow[]
  readonly rowsLabel: string | null
  readonly refinements: readonly AnswerRefinement[]
  readonly ledger: AnswerLedgerLink | null
  readonly provenance: AnswerProvenance
  readonly footnote: string | null
}

export const ANSWER_ROWS_DRAWN = 8

const GROUP_LABELS: Record<string, string> = {
  category: "category",
  description: "merchant",
  account: "account",
  month: "month",
}

const RANGE_LABELS: Record<string, string> = {
  "1d": "the last day",
  "1w": "the last week",
  "1m": "the last month",
  "3m": "the last three months",
  "6m": "the last six months",
  "1y": "the last year",
  all: "all time",
}

export function answerCardsFor(
  steps: readonly ToolPart[]
): readonly AnswerCard[] {
  return steps
    .map((step) => toAnswerCard(step))
    .filter((card): card is AnswerCard => card !== null)
}

export function toAnswerCard(step: ToolPart): AnswerCard | null {
  if (step.phase !== "done" || step.output === null) return null
  const output = parseJson(step.output)
  if (output === undefined) return null
  const input = asRecord(step.input) ?? {}

  switch (step.name) {
    case "aggregate_transactions":
      return aggregateCard(step, input, output)
    case "query_transactions":
      return queryCard(step, input, output)
    case "get_holdings":
      return holdingsCard(step, input, output)
    case "get_net_worth_history":
      return netWorthCard(step, input, output)
    case "get_portfolio_overview":
      return overviewCard(step, input, output)
    default:
      return null
  }
}

function aggregateCard(
  step: ToolPart,
  input: Record<string, unknown>,
  output: unknown
): AnswerCard | null {
  const body = asRecord(output)
  if (body === undefined) return null
  const currency = readString(body, "currency")
  const groups = readArray(body, "groups")
  if (currency === undefined || groups === undefined) return null

  const note = readString(body, "note") ?? null
  const groupBy = readString(input, "group_by") ?? "category"
  const dimension = GROUP_LABELS[groupBy] ?? groupBy

  const rows: AnswerRow[] = groups.map((raw, index) => {
    const group = asRecord(raw) ?? {}
    const amount = readNumber(group, "total_amount")
    return {
      key: `${step.callId}:${index}`,
      label: readString(group, "group_name") ?? `Group ${index + 1}`,
      meta: null,
      count: readNumber(group, "transaction_count"),
      figure: { value: amount, kind: "money", currency, signed: true },
    }
  })

  const complete = note === null
  const total = complete ? sumOf(rows.map((row) => row.figure.value)) : null

  return {
    id: step.callId,
    tool: step.name,
    label: `Totals by ${dimension}`,
    headline: { value: total, kind: "money", currency, signed: true },
    headlineNote: !complete
      ? note
      : rows.length === 0
        ? `${NOTHING_MATCHED}${rangePhrase(input)}.`
        : `across ${countOf(rows.length, "group")}${rangePhrase(input)}, in ${currency}`,
    countLabel: null,
    rows,
    rowsLabel: dimension,
    refinements: aggregateRefinements(step.callId, groupBy, input),
    ledger: ledgerLinkFor({
      q: readString(input, "description_filter"),
      account: readString(input, "account_id"),
      from: readString(input, "date_from"),
      to: readString(input, "date_to"),
    }),
    provenance: {
      tool: step.name,
      facts: [
        `${countOf(rows.length, "group")} in ${currency}`,
        scopePhrase(input),
      ].filter(isText),
      at: step.at,
    },
    footnote: complete ? null : note,
  }
}

function queryCard(
  step: ToolPart,
  input: Record<string, unknown>,
  output: unknown
): AnswerCard | null {
  const body = asRecord(output)
  if (body === undefined) return null
  const transactions = readArray(body, "transactions")
  if (transactions === undefined) return null

  const hasMore = body.has_more === true
  const rows: AnswerRow[] = transactions.map((raw, index) => {
    const row = asRecord(raw) ?? {}
    const ticker = readString(row, "unit") ?? null
    return {
      key: `${step.callId}:${index}`,
      label:
        readString(row, "description") ??
        readString(row, "transaction_type") ??
        "Transaction",
      meta: [readString(row, "date"), readString(row, "account")]
        .filter(isText)
        .join(" · "),
      count: null,
      figure: {
        value: readNumber(row, "amount"),
        kind: "units",
        ...(ticker === null ? {} : { ticker }),
        signed: true,
      },
    }
  })

  return {
    id: step.callId,
    tool: step.name,
    label: "Matching transactions",
    headline: { value: rows.length, kind: "plain", signed: false },
    headlineNote: hasMore
      ? `shown${rangePhrase(input)} — more match than were read`
      : `found${rangePhrase(input)}`,
    countLabel: hasMore ? "shown" : "found",
    rows,
    rowsLabel: "transaction",
    refinements: queryRefinements(step.callId, input),
    ledger: ledgerLinkFor({
      q: readString(input, "query"),
      account: readString(input, "account_id"),
      from: readString(input, "date_from"),
      to: readString(input, "date_to"),
    }),
    provenance: {
      tool: step.name,
      facts: [
        `${countOf(rows.length, "row")} read${hasMore ? ", not all that match" : ""}`,
        scopePhrase(input),
      ].filter(isText),
      at: step.at,
    },
    footnote: NATIVE_AMOUNT_FOOTNOTE,
  }
}

function holdingsCard(
  step: ToolPart,
  input: Record<string, unknown>,
  output: unknown
): AnswerCard | null {
  const body = asRecord(output)
  if (body === undefined) return null
  const currency = readString(asRecord(body.reference_currency) ?? {}, "code")
  const holdings = readArray(body, "holdings")
  if (currency === undefined || holdings === undefined) return null

  const groups = readArray(body, "groups")
  const unvalued = (readArray(body, "unvalued_assets") ?? []).filter(isText)

  const rows: AnswerRow[] =
    groups === undefined
      ? holdings.map((raw, index) => {
          const holding = asRecord(raw) ?? {}
          return {
            key: `${step.callId}:${index}`,
            label:
              readString(holding, "ticker") ??
              readString(holding, "asset_name") ??
              `Holding ${index + 1}`,
            meta: readString(holding, "account_name") ?? null,
            count: null,
            figure: {
              value: readNumber(holding, "value"),
              kind: "money" as const,
              currency,
              signed: false,
            },
          }
        })
      : groups.map((raw, index) => {
          const group = asRecord(raw) ?? {}
          return {
            key: `${step.callId}:${index}`,
            label: readString(group, "key") ?? `Group ${index + 1}`,
            meta: null,
            count: null,
            figure: {
              value: readNumber(group, "value"),
              kind: "money" as const,
              currency,
              signed: false,
            },
          }
        })

  return {
    id: step.callId,
    tool: step.name,
    label: "Holdings",
    headline: {
      value: readNumber(body, "total_value"),
      kind: "money",
      currency,
      signed: false,
    },
    headlineNote:
      unvalued.length === 0
        ? `across ${countOf(holdings.length, "holding")}, valued in ${currency}`
        : `across ${countOf(holdings.length, "holding")}, valued in ${currency}. ${countOf(unvalued.length, "holding")} ${pluralise(unvalued.length, "has", "have")} no price path and ${pluralise(unvalued.length, "is", "are")} not in this total: ${unvalued.join(", ")}.`,
    countLabel: null,
    rows,
    rowsLabel: groups === undefined ? "holding" : "group",
    refinements: holdingsRefinements(step.callId, input),
    ledger: null,
    provenance: {
      tool: step.name,
      facts: [
        `${countOf(holdings.length, "holding")} in ${currency}`,
        unvalued.length > 0
          ? `${String(unvalued.length)} unvalued`
          : "all priced",
      ],
      at: step.at,
    },
    footnote: null,
  }
}

function netWorthCard(
  step: ToolPart,
  input: Record<string, unknown>,
  output: unknown
): AnswerCard | null {
  const body = asRecord(output)
  if (body === undefined) return null
  const currency = readString(asRecord(body.reference_currency) ?? {}, "code")
  const change = readNumber(body, "change")
  if (currency === undefined || change === null) return null

  const range = readString(body, "range") ?? readString(input, "range") ?? "all"
  const start = readNumber(body, "start_value")
  const end = readNumber(body, "end_value")
  const points = readArray(body, "points") ?? []

  return {
    id: step.callId,
    tool: step.name,
    label: `Net worth change over ${RANGE_LABELS[range] ?? range}`,
    headline: { value: change, kind: "money", currency, signed: true },
    headlineNote: `from ${formatMoney(start, { currency })} to ${formatMoney(end, { currency })}`,
    countLabel: null,
    rows: [
      row(step.callId, "start", "Start of window", start, currency, false),
      row(step.callId, "end", "End of window", end, currency, false),
      row(step.callId, "change", "Change", change, currency, true),
    ],
    rowsLabel: null,
    refinements: rangeRefinements(step.callId, range),
    ledger: null,
    provenance: {
      tool: step.name,
      facts: [
        `${countOf(points.length, "daily point")} in ${currency}`,
        RANGE_LABELS[range] ?? range,
      ],
      at: step.at,
    },
    footnote: null,
  }
}

function overviewCard(
  step: ToolPart,
  _input: Record<string, unknown>,
  output: unknown
): AnswerCard | null {
  const body = asRecord(output)
  if (body === undefined) return null
  const currency = readString(asRecord(body.reference_currency) ?? {}, "code")
  const totals = asRecord(body.totals)
  if (currency === undefined || totals === undefined) return null

  const assets = readArray(body, "assets") ?? []

  return {
    id: step.callId,
    tool: step.name,
    label: "Portfolio, lifetime",
    headline: {
      value: readNumber(totals, "market_value"),
      kind: "money",
      currency,
      signed: false,
    },
    headlineNote: `market value of ${countOf(assets.length, "position")}, in ${currency}. Every figure below is lifetime, not windowed.`,
    countLabel: null,
    rows: [
      row(
        step.callId,
        "cost",
        "Cost basis",
        readNumber(totals, "total_cost_basis"),
        currency,
        false
      ),
      row(
        step.callId,
        "unrealised",
        "Unrealised gains",
        readNumber(totals, "unrealized_gains"),
        currency,
        true
      ),
      row(
        step.callId,
        "realised",
        "Realised gains",
        readNumber(totals, "realized_gains"),
        currency,
        true
      ),
      row(
        step.callId,
        "dividends",
        "Cash dividends",
        readNumber(totals, "cash_dividends"),
        currency,
        false
      ),
      row(
        step.callId,
        "fees",
        "Fees",
        readNumber(totals, "total_fees"),
        currency,
        false
      ),
    ],
    rowsLabel: null,
    refinements: [],
    ledger: null,
    provenance: {
      tool: step.name,
      facts: [`${countOf(assets.length, "position")} in ${currency}`],
      at: step.at,
    },
    footnote: null,
  }
}

function row(
  callId: string,
  key: string,
  label: string,
  value: number | null,
  currency: string,
  signed: boolean
): AnswerRow {
  return {
    key: `${callId}:${key}`,
    label,
    meta: null,
    count: null,
    figure: { value, kind: "money", currency, signed },
  }
}

function aggregateRefinements(
  callId: string,
  groupBy: string,
  input: Record<string, unknown>
): readonly AnswerRefinement[] {
  const others = Object.keys(GROUP_LABELS).filter((key) => key !== groupBy)
  const chips = others.map((key) => ({
    id: `${callId}:group:${key}`,
    label: `by ${GROUP_LABELS[key] ?? key}`,
    prompt: `Same question, but group by ${key} instead.`,
  }))
  if (readString(input, "date_from") !== undefined) {
    chips.push({
      id: `${callId}:range:all`,
      label: "all time",
      prompt: "Same question again, over all time rather than that date range.",
    })
  }
  return chips
}

function queryRefinements(
  callId: string,
  input: Record<string, unknown>
): readonly AnswerRefinement[] {
  const chips: AnswerRefinement[] = [
    {
      id: `${callId}:total`,
      label: "total these",
      prompt: "Total those transactions by category instead of listing them.",
    },
  ]
  if (readString(input, "account_id") !== undefined) {
    chips.push({
      id: `${callId}:all-accounts`,
      label: "all accounts",
      prompt: "Same question again, across every account rather than that one.",
    })
  }
  if (readString(input, "date_from") !== undefined) {
    chips.push({
      id: `${callId}:all-time`,
      label: "all time",
      prompt: "Same question again, over all time rather than that date range.",
    })
  }
  return chips
}

function holdingsRefinements(
  callId: string,
  input: Record<string, unknown>
): readonly AnswerRefinement[] {
  const current = readString(input, "group_by")
  return ["asset_type", "account", "currency"]
    .filter((key) => key !== current)
    .map((key) => ({
      id: `${callId}:holdings:${key}`,
      label: `by ${key.replace("_", " ")}`,
      prompt: `Same holdings, grouped by ${key.replace("_", " ")} instead.`,
    }))
}

function rangeRefinements(
  callId: string,
  range: string
): readonly AnswerRefinement[] {
  return ["1m", "1y", "all"]
    .filter((key) => key !== range)
    .map((key) => ({
      id: `${callId}:range:${key}`,
      label: RANGE_LABELS[key] ?? key,
      prompt: `Same question again, over ${RANGE_LABELS[key] ?? key}.`,
    }))
}

function ledgerLinkFor(candidate: {
  q?: string
  account?: string
  from?: string
  to?: string
}): AnswerLedgerLink | null {
  const search: AnswerLedgerSearch = {
    ...(candidate.q === undefined ? {} : { q: candidate.q }),
    ...(candidate.account === undefined ? {} : { account: candidate.account }),
    ...(candidate.from === undefined ? {} : { from: candidate.from }),
    ...(candidate.to === undefined ? {} : { to: candidate.to }),
  }

  const textApplied =
    search.q !== undefined &&
    LEDGER_FILTER_SUPPORT.text.support === "conditional" &&
    search.account === undefined
  const accountApplied =
    search.account !== undefined &&
    LEDGER_FILTER_SUPPORT.account.support === "server"
  if (!textApplied && !accountApplied) return null

  const unapplied: string[] = []
  if (search.q !== undefined && !textApplied) unapplied.push("text")
  if (
    (search.from !== undefined &&
      LEDGER_FILTER_SUPPORT.dateFrom.support === "unsupported") ||
    (search.to !== undefined &&
      LEDGER_FILTER_SUPPORT.dateTo.support === "unsupported")
  ) {
    unapplied.push("date range")
  }
  return { search, unapplied }
}

export function ledgerUnappliedNote(link: AnswerLedgerLink): string | null {
  if (link.unapplied.length === 0) return null
  return LEDGER_PARTIAL_NOTE(link.unapplied)
}

function rangePhrase(input: Record<string, unknown>): string {
  const from = readString(input, "date_from")
  const to = readString(input, "date_to")
  if (from === undefined && to === undefined) return ""
  if (from !== undefined && to !== undefined)
    return ` between ${from} and ${to}`
  return from === undefined ? ` up to ${String(to)}` : ` since ${from}`
}

function scopePhrase(input: Record<string, unknown>): string {
  const range = rangePhrase(input).trim()
  const filter =
    readString(input, "description_filter") ?? readString(input, "query")
  const parts = [
    range === "" ? "all dates" : range,
    filter === undefined ? null : `matching “${filter}”`,
    readString(input, "account_id") === undefined ? null : "one account",
  ].filter(isText)
  return parts.join(", ")
}

function sumOf(values: readonly (number | null)[]): number | null {
  if (values.length === 0) return null
  if (values.some((value) => value === null)) return null
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === "") return undefined
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function readArray(
  source: Record<string, unknown>,
  key: string
): unknown[] | undefined {
  const value = source[key]
  return Array.isArray(value) ? value : undefined
}

function readString(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key]
  return isText(value) ? value : undefined
}

function readNumber(
  source: Record<string, unknown>,
  key: string
): number | null {
  const value = source[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function figureText(figure: AnswerFigure, baseCurrency: string): string {
  const sign: SignDisplay = figure.signed ? "always" : "auto"
  switch (figure.kind) {
    case "money":
      return formatFigure(figure.value, {
        kind: "money",
        currency: figure.currency ?? baseCurrency,
        sign,
      })
    case "units":
      return formatFigure(figure.value, {
        kind: "units",
        ticker: figure.ticker ?? null,
        sign,
      })
    case "plain":
      return formatFigure(figure.value, { kind: "plain", decimals: 0, sign })
  }
}

export function answerCardTsv(card: AnswerCard, baseCurrency: string): string {
  const heading = [
    card.label,
    card.headline === null ? "" : figureText(card.headline, baseCurrency),
  ]
  const rows = card.rows.map((row) => [
    row.label,
    row.meta ?? "",
    row.count === null ? "" : String(row.count),
    figureText(row.figure, baseCurrency),
  ])
  return [heading, ...rows].map((cells) => cells.join("\t")).join("\n")
}
