import {
  createFixtureTransaction,
  deleteFixtureTransactions,
  fetchLedgerPage,
  isApiReachable,
  readSeedTemplate,
  type SeedRequest,
} from "./support/api"

const WANTED: readonly SeedRequest[] = [
  { description: "corner shop", amount: -4.25, daysAgo: 1 },
  { description: "bus fare", amount: -2.8, daysAgo: 2 },
  { description: "refund", amount: 15.4, daysAgo: 3 },
  { description: "imported card line", amount: -31.9, daysAgo: 4, ghost: true },
]

const MIN_ROWS_FOR_STEPPING = 4

export default async function globalSetup(): Promise<void> {
  if (!(await isApiReachable())) {
    console.log(
      "[e2e] API is unreachable — data-dependent specs will skip themselves."
    )
    return
  }

  await deleteFixtureTransactions()

  const page = await fetchLedgerPage(0, 1)
  const existing = page?.total_results ?? 0
  const template = await readSeedTemplate()

  if (template === null) {
    console.log(
      "[e2e] The ledger is empty, so there is no account/asset to clone — seeding skipped."
    )
    return
  }

  if (existing >= MIN_ROWS_FOR_STEPPING) {
    console.log(
      `[e2e] Ledger already holds ${String(existing)} transactions — seeding skipped.`
    )
    return
  }

  let created = 0
  for (const request of WANTED) {
    if ((await createFixtureTransaction(template, request)) !== null) {
      created += 1
    }
  }
  console.log(`[e2e] Seeded ${String(created)} fixture transactions.`)
}
