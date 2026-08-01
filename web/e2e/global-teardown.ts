import { deleteFixtureTransactions, isApiReachable } from "./support/api"

export default async function globalTeardown(): Promise<void> {
  if (!(await isApiReachable())) return
  const removed = await deleteFixtureTransactions()
  console.log(`[e2e] Removed ${String(removed)} fixture transactions.`)
}
