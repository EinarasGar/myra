import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
  type RegisteredRouter,
} from "@tanstack/react-router"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"

import {
  readFlag,
  readKeySet,
  usePeriodSearch,
  useSearchState,
  writeFlag,
  writeKeySet,
} from "./search-state"

const searchSchema = z.object({
  period: z.string().optional().catch(undefined),
  expand: z.string().optional().catch(undefined),
  why: z.string().optional().catch(undefined),
})

function Probe() {
  const [period, setPeriod] = usePeriodSearch()
  const [expanded, setExpanded] = useSearchState(
    "expand",
    readKeySet,
    writeKeySet
  )
  const [why, setWhy] = useSearchState("why", readFlag, writeFlag)

  return (
    <div>
      <p data-testid="period">{period}</p>
      <p data-testid="expand">{[...expanded].join("|")}</p>
      <p data-testid="why">{String(why)}</p>
      <button
        onClick={() => {
          setPeriod("1y")
        }}
      >
        1Y
      </button>
      <button
        onClick={() => {
          const next = new Set(expanded)
          if (next.has("vwrp")) next.delete("vwrp")
          else next.add("vwrp")
          setExpanded(next)
        }}
      >
        toggle vwrp
      </button>
      <button
        onClick={() => {
          setWhy(!why)
        }}
      >
        toggle why
      </button>
    </div>
  )
}

function renderProbe(initialPath: string) {
  const rootRoute = createRootRoute()
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/portfolio",
    validateSearch: searchSchema,
    component: Probe,
  })
  const router: AnyRouter = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  const result = render(
    <RouterProvider router={router as unknown as RegisteredRouter} />
  )
  return { ...result, router }
}

const shown = (id: string) => screen.getByTestId(id).textContent

afterEach(cleanup)

describe("useSearchState", () => {
  it("defaults when the URL says nothing", async () => {
    renderProbe("/portfolio")
    expect(await screen.findByTestId("period")).toHaveTextContent("1m")
    expect(shown("expand")).toBe("")
    expect(shown("why")).toBe("false")
  })

  it("writes what was picked into the URL and reads the same thing back", async () => {
    const user = userEvent.setup()
    const { router } = renderProbe("/portfolio")
    await screen.findByTestId("period")

    await user.click(screen.getByRole("button", { name: "1Y" }))
    await user.click(screen.getByRole("button", { name: "toggle vwrp" }))
    await user.click(screen.getByRole("button", { name: "toggle why" }))

    expect(shown("period")).toBe("1y")
    expect(shown("expand")).toBe("vwrp")
    expect(shown("why")).toBe("true")

    await waitFor(() => {
      expect(router.state.location.href).toBe(
        "/portfolio?period=1y&expand=vwrp&why=on"
      )
    })
    const shared = router.state.location.href

    cleanup()
    renderProbe(shared)
    expect(await screen.findByTestId("period")).toHaveTextContent("1y")
    expect(shown("expand")).toBe("vwrp")
    expect(shown("why")).toBe("true")
  })

  it("keeps the default out of the URL rather than pinning it there", async () => {
    const user = userEvent.setup()
    const { router } = renderProbe("/portfolio?period=1y&why=on")
    await screen.findByTestId("period")

    await user.click(screen.getByRole("button", { name: "toggle why" }))
    expect(shown("why")).toBe("false")
    await waitFor(() => {
      expect(router.state.location.href).toBe("/portfolio?period=1y")
    })
  })

  it("adjusts rather than stacking, so Back leaves the page", async () => {
    const user = userEvent.setup()
    const { router } = renderProbe("/portfolio")
    await screen.findByTestId("period")
    const before = router.history.length

    await user.click(screen.getByRole("button", { name: "1Y" }))
    await user.click(screen.getByRole("button", { name: "toggle vwrp" }))

    expect(router.history.length).toBe(before)
  })

  it("adopts a change that came from elsewhere", async () => {
    const user = userEvent.setup()
    const { router } = renderProbe("/portfolio")
    await screen.findByTestId("period")
    await user.click(screen.getByRole("button", { name: "1Y" }))
    expect(shown("period")).toBe("1y")

    await act(async () => {
      await router.navigate({
        to: "/portfolio",
        search: { period: "3m" },
      })
    })
    expect(shown("period")).toBe("3m")
  })

  it("falls back on a hand-edited value it cannot read", async () => {
    renderProbe("/portfolio?period=1000y&why=maybe&expand=")
    expect(await screen.findByTestId("period")).toHaveTextContent("1m")
    expect(shown("why")).toBe("false")
    expect(shown("expand")).toBe("")
  })
})
