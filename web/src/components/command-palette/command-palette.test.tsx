import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthSession } from "@/auth"
import { AuthSessionContext } from "@/auth"
import type { AccountsView } from "@/features/accounts/api"
import { queryKeys } from "@/lib/query"

import { CommandPalette } from "./command-palette"
import { usePaletteStore } from "./palette-store"

const USER_ID = "user-1"

const SESSION: AuthSession = {
  status: "authenticated",
  isReady: true,
  isAuthenticated: true,
  userId: USER_ID,
  baseCurrency: "GBP",
  signOut: async () => {},
}

function accountsView(): AccountsView {
  return {
    accounts: [
      {
        accountId: "acc-1",
        name: "Lloyds Current",
        accountTypeId: 1,
        accountTypeName: "Current account",
        accountClass: "cash",
        isLiquid: true,
        isLiability: false,
        liquidityTypeId: 1,
        liquidityTypeName: "Liquid",
        ownershipShare: 1,
        ownershipSharePercent: 100,
        isJoint: false,
        suggestedCurrencyAssetId: null,
        suggestedCurrency: null,
      },
    ],
    byId: {},
    groups: [],
    count: 1,
    jointCount: 0,
    accountTypes: [],
    liquidityTypes: [],
    assetsById: {},
  }
}

function buildRouter(): AnyRouter {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Outlet />
        <input
          aria-label="editor"
          onKeyDown={(event) => {
            if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
            }
          }}
        />
        <CommandPalette />
      </>
    ),
  })
  const leaf = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => <p>{path}</p>,
      validateSearch: (search: Record<string, unknown>) => search,
    })

  return createRouter({
    routeTree: rootRoute.addChildren([
      leaf("/"),
      leaf("/portfolio"),
      leaf("/ai-chat"),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
}

function renderPalette(seedAccounts = false): AnyRouter {
  const router = buildRouter()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  if (seedAccounts) {
    queryClient.setQueryData(
      queryKeys.user(USER_ID).accounts.list(),
      accountsView()
    )
  }
  render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionContext value={SESSION}>
        <RouterProvider router={router as unknown as RegisteredRouter} />
      </AuthSessionContext>
    </QueryClientProvider>
  )
  return router
}

describe("CommandPalette", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    usePaletteStore.setState({
      open: false,
      query: "",
      contextDismissed: false,
    })
  })

  it("opens and closes on the ⌘K chord", async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.keyboard("{Meta>}k{/Meta}")
    await waitFor(() => {
      expect(usePaletteStore.getState().open).toBe(true)
    })

    await user.keyboard("{Meta>}k{/Meta}")
    await waitFor(() => {
      expect(usePaletteStore.getState().open).toBe(false)
    })
  })

  it("leaves the chord alone once another handler has claimed it", async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.click(await screen.findByLabelText("editor"))
    await user.keyboard("{Meta>}k{/Meta}")

    expect(usePaletteStore.getState().open).toBe(false)
  })

  it("navigates on a noun", async () => {
    const user = userEvent.setup()
    const router = renderPalette()

    await user.keyboard("{Meta>}k{/Meta}")
    const input = await screen.findByPlaceholderText("Search or ask Myra…")
    await user.type(input, "portfolio")

    await user.click(await screen.findByText("Portfolio"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/portfolio")
    })
    expect(usePaletteStore.getState().open).toBe(false)
  })

  it("reaches Review, which shares a path with Explore", async () => {
    const user = userEvent.setup()
    const router = renderPalette()

    await user.keyboard("{Meta>}k{/Meta}")
    const input = await screen.findByPlaceholderText("Search or ask Myra…")
    await user.type(input, "review")

    await user.click(await screen.findByText("Review"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/transactions")
    })
    expect(router.state.location.search).toMatchObject({ mode: "review" })
  })

  it("opens an account from its name", async () => {
    const user = userEvent.setup()
    const router = renderPalette(true)

    await user.keyboard("{Meta>}k{/Meta}")
    const input = await screen.findByPlaceholderText("Search or ask Myra…")
    await user.type(input, "lloyds")

    await user.click(await screen.findByText("Lloyds Current"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/accounts/acc-1")
    })
  })

  it("opens a settings section directly", async () => {
    const user = userEvent.setup()
    const router = renderPalette()

    await user.keyboard("{Meta>}k{/Meta}")
    const input = await screen.findByPlaceholderText("Search or ask Myra…")
    await user.type(input, "connections")

    await user.click(await screen.findByText("Settings · Connections"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings")
    })
    expect(router.state.location.search).toMatchObject({
      section: "connections",
    })
  })

  it("offers Myra on a question and carries the page's own name as context", async () => {
    const user = userEvent.setup()
    const router = renderPalette()

    await user.keyboard("{Meta>}k{/Meta}")
    const input = await screen.findByPlaceholderText("Search or ask Myra…")
    await user.type(input, "how much did I spend on groceries?")

    await user.click(await screen.findByText("Ask Myra"))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/ai-chat")
    })
    expect(router.state.location.search).toMatchObject({
      ask: "how much did I spend on groceries?",
      context: "Dashboard",
    })
  })
})
