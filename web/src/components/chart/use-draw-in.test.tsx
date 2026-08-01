import { StrictMode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useDrawIn } from "./use-draw-in"

function Probe({ ready }: { ready: boolean }) {
  const drawn = useDrawIn(ready)
  return <span data-testid="probe" data-drawn={drawn ? "true" : "false"} />
}

const drawn = () => screen.getByTestId("probe").getAttribute("data-drawn")

describe("useDrawIn", () => {
  it("draws in under StrictMode, whose simulated remount cancels the first frame", async () => {
    render(
      <StrictMode>
        <Probe ready />
      </StrictMode>
    )

    await waitFor(() => expect(drawn()).toBe("true"))
  })

  it("draws in without StrictMode", async () => {
    render(<Probe ready />)

    await waitFor(() => expect(drawn()).toBe("true"))
  })

  it("stays undrawn until the series is plottable", async () => {
    const { rerender } = render(
      <StrictMode>
        <Probe ready={false} />
      </StrictMode>
    )
    expect(drawn()).toBe("false")

    rerender(
      <StrictMode>
        <Probe ready />
      </StrictMode>
    )
    await waitFor(() => expect(drawn()).toBe("true"))
  })

  it("never replays once it has drawn", async () => {
    const { rerender } = render(<Probe ready />)
    await waitFor(() => expect(drawn()).toBe("true"))

    rerender(<Probe ready={false} />)
    rerender(<Probe ready />)

    expect(drawn()).toBe("true")
  })
})
