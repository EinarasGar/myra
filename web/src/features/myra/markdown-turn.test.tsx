import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createConversation = vi.fn()
const listConversations = vi.fn()
const getMessages = vi.fn()
const getUsage = vi.fn()
const getAccounts = vi.fn()

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api")>()),
  AIConversationsApiFactory: () => ({
    createConversation: (userId: string) =>
      createConversation(userId) as unknown,
    listConversations: (userId: string, options: unknown) =>
      listConversations(userId, options) as unknown,
    getMessages: (userId: string, id: string, options: unknown) =>
      getMessages(userId, id, options) as unknown,
  }),
  AIApiFactory: () => ({
    getUsage: (userId: string, options: unknown) =>
      getUsage(userId, options) as unknown,
  }),
  AccountsApiFactory: () => ({
    getAccounts: (userId: string, options: unknown) =>
      getAccounts(userId, options) as unknown,
  }),
}))

const { MyraScreen } = await import("./myra-screen")
const { renderMyra, sseFrame, sseResponse, stubViewport } =
  await import("./test-harness")

const ANSWER = `Your net worth is **£156,452.75** today.

### Portfolio

| Asset | Market value |
|:---|:---|
| Apple Inc | £12,480.20 |
| Cash | £1,204.00 |

See the [ledger](/transactions) for the detail.`

function textFrame(text: string): string {
  const data = text
    .split("\n")
    .map((line) => `data: ${line}`)
    .join("\n")
  return `event: text\n${data}\n\n`
}

const SPLIT_AT = ANSWER.indexOf("| Apple")

const STREAMED = [
  textFrame(ANSWER.slice(0, SPLIT_AT)),
  textFrame(ANSWER.slice(SPLIT_AT)),
  sseFrame("done", ""),
]

let sseQueue: Response[] = []

function fetchStub() {
  const next = sseQueue.shift()
  if (next === undefined)
    return Promise.resolve(sseResponse([sseFrame("done", "")]))
  return Promise.resolve(next)
}

beforeEach(() => {
  sseQueue = []
  stubViewport(1440)
  createConversation.mockResolvedValue({ data: { id: "conv-1" } })
  listConversations.mockResolvedValue({ data: [] })
  getMessages.mockResolvedValue({ data: [] })
  getUsage.mockRejectedValue(new Error("no usage"))
  getAccounts.mockResolvedValue({
    data: {
      accounts: [],
      lookup_tables: {
        assets: [],
        account_types: [],
        account_liquidity_types: [],
      },
    },
  })
  vi.stubGlobal("fetch", vi.fn(fetchStub))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function ask(question: string) {
  const user = userEvent.setup()
  const input = await screen.findByRole("textbox", {
    name: /ask about your money/i,
  })
  await user.type(input, question)
  await user.click(screen.getByRole("button", { name: /^send/i }))
  return user
}

describe("Myra's answers as rendered markdown", () => {
  it("draws the table, the bold figure and the link instead of their source", async () => {
    sseQueue = [sseResponse(STREAMED)]
    await renderMyra(<MyraScreen />)
    await ask("how am I doing?")

    const table = await screen.findByRole("table")
    expect(
      within(table).getByRole("columnheader", { name: "Market value" })
    ).toHaveClass("text-right")
    expect(within(table).getByRole("cell", { name: "Apple Inc" })).toBeVisible()

    expect(screen.queryByText(/\|:---\|/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\*\*£156,452\.75\*\*/)).not.toBeInTheDocument()

    const headline = screen.getByText("£156,452.75")
    expect(headline).toHaveAttribute("data-figure")
    expect(headline.closest("strong")).not.toBeNull()

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "Portfolio"
    )
    expect(screen.getByRole("link", { name: "ledger" })).toHaveAttribute(
      "href",
      "/transactions"
    )
  })

  it("copies the answer back out as markdown", async () => {
    sseQueue = [sseResponse(STREAMED)]
    await renderMyra(<MyraScreen />)
    const user = await ask("how am I doing?")

    await screen.findByRole("table")
    await user.click(screen.getByRole("button", { name: /copy answer/i }))

    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(ANSWER)
    })
  })
})
