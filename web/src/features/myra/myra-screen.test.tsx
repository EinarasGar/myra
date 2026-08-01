import { useState } from "react"

import { act, screen, waitFor, within } from "@testing-library/react"
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
const { renderMyra, sseFrame, sseResponse, stubViewport, TEST_USER_ID } =
  await import("./test-harness")

const AGGREGATE_OUTPUT = JSON.stringify({
  currency: "GBP",
  groups: [
    { group_name: "Groceries", total_amount: -412.5, transaction_count: 18 },
    { group_name: "Transport", total_amount: -87.25, transaction_count: 6 },
  ],
})

const ANSWER_FRAMES = [
  sseFrame("tool_call", {
    call_id: "call-1",
    name: "aggregate_transactions",
    input: { group_by: "category", description_filter: "tesco" },
  }),
  sseFrame("tool_result", {
    name: "aggregate_transactions",
    output: AGGREGATE_OUTPUT,
  }),
  sseFrame("text", "You spent most on groceries."),
  sseFrame("done", ""),
]

const PROPOSAL_FRAMES = [
  sseFrame("tool_request", {
    tool_call_id: "call-w1",
    name: "create_transaction",
    args: {
      date: "2026-06-04",
      description: "Tesco",
      amount: 42.18,
      account_id: "acc-1",
      category_id: 7,
      asset_id: 1,
    },
  }),
  sseFrame("done", ""),
]

let sseCalls: { url: string; init: RequestInit | undefined }[] = []
let sseQueue: Response[] = []

function fetchStub(input: RequestInfo | URL, init?: RequestInit) {
  sseCalls.push({ url: String(input), init })
  const next = sseQueue.shift()
  if (next === undefined)
    return Promise.resolve(sseResponse([sseFrame("done", "")]))
  return Promise.resolve(next)
}

beforeEach(() => {
  sseCalls = []
  sseQueue = []
  stubViewport(1440)
  createConversation.mockResolvedValue({ data: { id: "conv-1" } })
  listConversations.mockResolvedValue({
    data: [
      {
        id: "conv-0",
        title: "Groceries last month",
        created_at: "2026-07-31T08:00:00.000Z",
        updated_at: "2026-07-31T08:00:00.000Z",
      },
    ],
  })
  getMessages.mockResolvedValue({ data: [] })
  getUsage.mockResolvedValue({
    data: {
      hourly: {
        input: { used: 41, limit: 100 },
        output: { used: 0, limit: 0 },
        reset_at: "2026-07-31T10:00:00.000Z",
      },
      monthly: {
        input: { used: 5, limit: 100 },
        output: { used: 0, limit: 0 },
        reset_at: "2026-08-01T00:00:00.000Z",
      },
    },
  })
  getAccounts.mockResolvedValue({
    data: {
      accounts: [
        {
          account_id: "acc-1",
          name: "Lloyds Current",
          account_type: 1,
          liquidity_type: 1,
          ownership_share: 1,
        },
      ],
      lookup_tables: {
        assets: [],
        account_types: [{ id: 1, name: "Current" }],
        account_liquidity_types: [{ id: 1, name: "Liquid" }],
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

describe("Myra, end to end over a real SSE stream", () => {
  it("sends a question, streams the answer, and prints the tool's own figures", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES)]
    await renderMyra(<MyraScreen />)
    await ask("what did I spend on groceries?")

    await waitFor(() => {
      expect(createConversation).toHaveBeenCalledWith(TEST_USER_ID)
    })
    await waitFor(() => {
      expect(sseCalls[0]?.url).toContain(
        `/api/users/${TEST_USER_ID}/ai/conversations/conv-1/messages`
      )
    })
    expect(JSON.parse(String(sseCalls[0]?.init?.body))).toEqual({
      message: "what did I spend on groceries?",
      file_ids: [],
    })

    const card = await screen.findByTestId("answer")
    expect(within(card).getByText("Totals by category")).toBeInTheDocument()
    expect(within(card).getByText("−£499.75")).toBeInTheDocument()
    expect(within(card).getByText("Groceries")).toBeInTheDocument()
    expect(within(card).getByText("−£412.50")).toBeInTheDocument()
    expect(
      await screen.findByText("You spent most on groceries.")
    ).toBeInTheDocument()
  })

  it("prints provenance and a working ledger link on the answer", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES)]
    await renderMyra(<MyraScreen />)
    await ask("groceries?")

    const card = await screen.findByTestId("answer")
    expect(
      within(card).getByText(/aggregate_transactions · 2 groups in GBP/)
    ).toBeInTheDocument()
    expect(within(card).getByText(/read \d\d:\d\d/)).toBeInTheDocument()
    const link = within(card).getByRole("link", { name: /open these/i })
    expect(link).toHaveAttribute("href", expect.stringContaining("q=tesco"))
  })

  it("collapses the tool call to one line and reveals steps then raw on demand", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES)]
    await renderMyra(<MyraScreen />)
    const user = await ask("groceries?")

    const showWork = await screen.findByRole("button", { name: /show work/i })
    expect(screen.queryByText("Parameters")).not.toBeInTheDocument()

    await user.click(showWork)
    expect(screen.queryByText("Parameters")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^raw$/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^raw$/i }))
    expect(screen.getByText("Parameters")).toBeInTheDocument()
    expect(screen.getByText("group_by")).toBeInTheDocument()
    expect(screen.getByText(AGGREGATE_OUTPUT)).toBeInTheDocument()
  })

  it("re-runs the question with one parameter changed when a refinement is used", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES), sseResponse(ANSWER_FRAMES)]
    await renderMyra(<MyraScreen />)
    const user = await ask("groceries?")

    await screen.findByTestId("answer")
    await user.click(screen.getByRole("button", { name: "by month" }))

    await waitFor(() => {
      expect(sseCalls).toHaveLength(2)
    })
    expect(JSON.parse(String(sseCalls[1]?.init?.body))).toEqual({
      message: "Same question, but group by month instead.",
      file_ids: [],
    })
  })

  it("pins an answer and refuses a comparison it cannot make", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES)]
    await renderMyra(<MyraScreen />)
    const user = await ask("groceries?")

    await screen.findByTestId("answer")
    await user.click(screen.getByRole("button", { name: "Pin" }))

    const pins = screen.getByRole("region", { name: /pinned/i })
    expect(within(pins).getByText("Totals by category")).toBeInTheDocument()
    expect(within(pins).getByText("−£499.75")).toBeInTheDocument()
    expect(
      within(pins).getByText(/Pins last for this visit/)
    ).toBeInTheDocument()
  })

  it("shows the approval card as the loud element and writes nothing until approved", async () => {
    sseQueue = [
      sseResponse(PROPOSAL_FRAMES),
      sseResponse([sseFrame("done", "")]),
    ]
    await renderMyra(<MyraScreen />)
    const user = await ask("log a £42.18 tesco shop")

    const approval = await screen.findByTestId("approval")
    expect(
      within(approval).getByText("Your approval is needed")
    ).toBeInTheDocument()
    expect(
      within(approval).getByText("Record a transaction")
    ).toBeInTheDocument()
    expect(within(approval).getByText("Tesco")).toBeInTheDocument()
    expect(
      await within(approval).findByText("Lloyds Current")
    ).toBeInTheDocument()
    expect(
      within(approval).getByText(/net effect on net worth is not shown/i)
    ).toBeInTheDocument()
    expect(sseCalls).toHaveLength(1)

    await user.click(
      within(approval).getByRole("button", { name: /^approve$/i })
    )
    await waitFor(() => {
      expect(sseCalls).toHaveLength(2)
    })
    expect(JSON.parse(String(sseCalls[1]?.init?.body))).toEqual({
      tool_approvals: [{ tool_call_id: "call-w1", approved: true }],
    })
  })

  it("records a denial as a receipt instead of writing", async () => {
    sseQueue = [
      sseResponse(PROPOSAL_FRAMES),
      sseResponse([sseFrame("done", "")]),
    ]
    await renderMyra(<MyraScreen />)
    const user = await ask("log a tesco shop")

    const approval = await screen.findByTestId("approval")
    await user.click(within(approval).getByRole("button", { name: /deny/i }))

    expect(
      await screen.findByText(/You denied this. Nothing was written./)
    ).toBeInTheDocument()
    expect(JSON.parse(String(sseCalls[1]?.init?.body))).toEqual({
      tool_approvals: [{ tool_call_id: "call-w1", approved: false }],
    })
  })

  it("surfaces a mid-stream error inline with a retry, never a dialog", async () => {
    sseQueue = [
      sseResponse([
        sseFrame("text", "Working on it"),
        sseFrame("error", {
          kind: "fatal",
          message: "The model stopped responding.",
        }),
      ]),
      sseResponse([sseFrame("text", " — done."), sseFrame("done", "")]),
    ]
    await renderMyra(<MyraScreen />)
    const user = await ask("groceries?")

    const alert = await screen.findByRole("alert")
    expect(
      within(alert).getByText("The model stopped responding.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await user.click(within(alert).getByRole("button", { name: /retry/i }))
    await waitFor(() => {
      expect(sseCalls[1]?.url).toContain("/conversations/conv-1/retry")
    })
    expect(sseCalls[1]?.init?.body).toBeUndefined()
  })

  it("shows a rate limit as a banner and drops the message that was never sent", async () => {
    sseQueue = [
      new Response(
        JSON.stringify({
          error_type: "RateLimited",
          message: "Rate limit exceeded.",
          errors: [],
          details: {
            kind: "rate_limited",
            message: "You have used this hour's Myra allowance.",
            reset_at: "2026-07-31T11:00:00.000Z",
          },
        }),
        { status: 429, headers: { "content-type": "application/json" } }
      ),
    ]
    await renderMyra(<MyraScreen />)
    await ask("groceries?")

    const banner = await screen.findByTestId("rate-limit")
    expect(
      within(banner).getByText(/used this hour's Myra allowance/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("groceries?")).not.toBeInTheDocument()
  })

  it("asks the question the palette carried, with the page it was asked from", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES)]
    const consumed = vi.fn()
    await renderMyra(
      <MyraScreen
        ask="is my portfolio up?"
        contextPage="Portfolio"
        onAskConsumed={consumed}
      />
    )

    await waitFor(() => {
      expect(sseCalls).toHaveLength(1)
    })
    expect(JSON.parse(String(sseCalls[0]?.init?.body))).toEqual({
      message: "is my portfolio up?\n\n(Asked from the Portfolio page.)",
      file_ids: [],
    })
    expect(consumed).toHaveBeenCalled()
    expect(await screen.findByText("Asked from Portfolio")).toBeInTheDocument()
  })

  it("sends the same palette question again after the first was consumed", async () => {
    sseQueue = [sseResponse(ANSWER_FRAMES), sseResponse(ANSWER_FRAMES)]
    let setAsk: (value: string | undefined) => void = () => {}
    function Driver() {
      const [askValue, set] = useState<string | undefined>("groceries?")
      setAsk = set
      return (
        <MyraScreen
          ask={askValue}
          onAskConsumed={() => {
            set(undefined)
          }}
        />
      )
    }

    await renderMyra(<Driver />)
    await waitFor(() => {
      expect(sseCalls).toHaveLength(1)
    })

    act(() => {
      setAsk("groceries?")
    })
    await waitFor(() => {
      expect(sseCalls).toHaveLength(2)
    })
  })

  it("reads the quota from the API and says it does not move mid-turn", async () => {
    await renderMyra(<MyraScreen />)
    expect(await screen.findByText("hourly")).toBeInTheDocument()
    expect(screen.getByText("41%")).toBeInTheDocument()
  })

  it("opens a stored chat from the list and restores its proposal state", async () => {
    getMessages.mockResolvedValue({
      data: [
        {
          id: "m1",
          role: "user",
          content: { type: "user", content: "log a shop" },
          file_ids: [],
          created_at: "2026-07-31T08:00:00.000Z",
        },
        {
          id: "m2",
          role: "assistant",
          content: {
            type: "assistant_tool_call",
            tool_call_id: "call-w1",
            name: "create_transaction",
            args: '{"description":"Tesco","amount":42.18,"account_id":"acc-1"}',
          },
          file_ids: [],
          created_at: "2026-07-31T08:00:01.000Z",
        },
      ],
    })
    await renderMyra(<MyraScreen />)
    const user = userEvent.setup()
    await user.click(
      await screen.findByRole("button", { name: "Groceries last month" })
    )

    const approval = await screen.findByTestId("approval")
    expect(within(approval).getByText("Tesco")).toBeInTheDocument()
    expect(screen.getByText("log a shop")).toBeInTheDocument()
  })
})

describe("Myra at every width", () => {
  it.each([
    ["full", 1440, true],
    ["tight", 1100, true],
    ["stacked", 900, false],
    ["phone", 390, false],
  ] as const)(
    "keeps one composer and a reachable answer at %s",
    async (_name, width, sidebarBesideTranscript) => {
      stubViewport(width)
      sseQueue = [sseResponse(ANSWER_FRAMES)]
      await renderMyra(<MyraScreen />)
      await ask("groceries?")

      const card = await screen.findByTestId("answer")
      expect(within(card).getByText("−£499.75")).toBeInTheDocument()
      expect(
        screen.getAllByRole("textbox", { name: /ask about your money/i })
      ).toHaveLength(1)
      expect(screen.getAllByRole("navigation", { name: "Chats" })).toHaveLength(
        1
      )

      const nav = screen.getByRole("navigation", { name: "Chats" })
      const transcript = screen.getByLabelText("Conversation with Myra")
      const navBeforeTranscript = Boolean(
        nav.compareDocumentPosition(transcript) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(navBeforeTranscript).toBe(sidebarBesideTranscript)
    }
  )
})
