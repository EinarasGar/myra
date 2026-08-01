import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const searchAssets = vi.fn()
const postBaseAsset = vi.fn()
const postOnboarding = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  searchAssets,
  postBaseAsset,
  postOnboarding,
}

vi.mock("@/lib/api", () => ({
  api: () =>
    new Proxy(
      {},
      {
        get: (_target, name: string) =>
          ENDPOINTS[name] ?? (() => Promise.resolve({ data: {} })),
      }
    ),
  resolveApiUrl: (path: string) => `http://localhost:5000${path}`,
}))

const { OnboardingWizard } = await import("./wizard")
const {
  authenticatedSession,
  renderInShell,
  stubViewport,
  TEST_USER_ID,
  VIEWPORTS,
} = await import("./test-harness")

const CURRENCIES = [
  { asset_id: 1, ticker: "EUR", name: "Euro", asset_type: 1 },
  { asset_id: 2, ticker: "GBP", name: "British Pound Sterling", asset_type: 1 },
  { asset_id: 3, ticker: "USD", name: "United States Dollar", asset_type: 1 },
]

beforeEach(() => {
  stubViewport(VIEWPORTS.full)
  searchAssets.mockResolvedValue({ data: { results: CURRENCIES } })
  postBaseAsset.mockResolvedValue({ data: {} })
  postOnboarding.mockResolvedValue({ data: {} })
})

async function stepToCurrency(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /continue/i }))
  await screen.findByRole("listbox", { name: /search currencies/i })
}

describe("OnboardingWizard", () => {
  it("walks welcome to base currency to start, and only then finishes onboarding", async () => {
    const user = userEvent.setup()
    const { visited } = await renderInShell(<OnboardingWizard />)

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
    expect(screen.getByText("One ledger for all of it")).toBeInTheDocument()

    await stepToCurrency(user)
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument()
    expect(postBaseAsset).not.toHaveBeenCalled()

    await user.click(screen.getByRole("option", { name: /GBP/ }))
    await user.click(screen.getByRole("button", { name: /Use GBP/ }))

    await waitFor(() =>
      expect(postBaseAsset).toHaveBeenCalledWith(TEST_USER_ID, { asset_id: 2 })
    )
    expect(postOnboarding).not.toHaveBeenCalled()

    await screen.findByText("Step 3 of 3")
    await user.click(screen.getByRole("button", { name: /Add a transaction/ }))

    await waitFor(() =>
      expect(postOnboarding).toHaveBeenCalledWith(TEST_USER_ID, { version: 1 })
    )
    await waitFor(() => expect(visited).toContain("/transactions"))
  })

  it("resumes at the last step when a base currency already exists", async () => {
    await renderInShell(<OnboardingWizard />, {
      session: authenticatedSession("GBP"),
    })

    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument()
    expect(screen.getByText(/^GBP · Saved\./)).toBeInTheDocument()
  })

  it.each([
    ["bank", /Connect a bank/, "/settings?section=connections"],
    ["receipt", /Snap a receipt/, "/transactions?mode=review"],
  ])("sends %s to %s", async (_id, label, destination) => {
    const user = userEvent.setup()
    const { visited } = await renderInShell(<OnboardingWizard />, {
      session: authenticatedSession("GBP"),
    })

    await user.click(await screen.findByRole("button", { name: label }))
    await waitFor(() => expect(visited).toContain(destination))
  })

  it("advances onboarding before skipping to the dashboard", async () => {
    const user = userEvent.setup()
    const { visited } = await renderInShell(<OnboardingWizard />, {
      session: authenticatedSession("GBP"),
    })

    await user.click(
      await screen.findByRole("button", { name: /Skip for now/ })
    )

    await waitFor(() =>
      expect(postOnboarding).toHaveBeenCalledWith(TEST_USER_ID, { version: 1 })
    )
    await waitFor(() => expect(visited).toContain("/"))
  })

  it("never navigates away when finishing onboarding fails", async () => {
    postOnboarding.mockRejectedValue(new Error("boom"))
    const user = userEvent.setup()
    const { visited } = await renderInShell(<OnboardingWizard />, {
      session: authenticatedSession("GBP"),
    })

    await user.click(
      await screen.findByRole("button", { name: /Skip for now/ })
    )

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(visited).not.toContain("/")
  })

  it.each([
    ["full", VIEWPORTS.full, true],
    ["tight", VIEWPORTS.tight, true],
    ["stacked", VIEWPORTS.stacked, false],
    ["phone", VIEWPORTS.phone, false],
  ])(
    "stays operable at %s, with the key hint only where a keyboard is likely",
    async (_name, width, hasKeyHint) => {
      stubViewport(width)
      await renderInShell(<OnboardingWizard />)

      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument()
      const next = screen.getByRole("button", { name: /Continue/ })
      expect(next).toBeEnabled()
      expect(next.textContent?.includes("⏎")).toBe(hasKeyHint)

      const tracker = screen.getByRole("list", { name: "Setup steps" })
      expect(within(tracker).getByText("Base currency")).toBeInTheDocument()
    }
  )
})
