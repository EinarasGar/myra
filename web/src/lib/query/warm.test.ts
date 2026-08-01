import { describe, expect, it, vi } from "vitest"

import { warm } from "./warm"

describe("warm", () => {
  it("returns before the requests it starts have settled", async () => {
    let settled = false
    const slow = new Promise((resolve) => {
      setTimeout(() => {
        settled = true
        resolve(undefined)
      }, 10)
    })

    warm([slow])

    expect(settled).toBe(false)
    await slow
    expect(settled).toBe(true)
  })

  it("starts every request rather than chaining them", () => {
    const started: number[] = []
    const request = (id: number) => {
      started.push(id)
      return Promise.resolve()
    }

    warm([request(1), request(2), request(3)])

    expect(started).toEqual([1, 2, 3])
  })

  it("swallows rejections so a failed warm never becomes an unhandled error", async () => {
    const onUnhandled = vi.fn()
    process.on("unhandledRejection", onUnhandled)

    warm([Promise.reject(new Error("offline"))])
    await new Promise((resolve) => setTimeout(resolve, 20))

    process.off("unhandledRejection", onUnhandled)
    expect(onUnhandled).not.toHaveBeenCalled()
  })

  it("does nothing when there is nothing to warm", () => {
    expect(() => {
      warm([])
    }).not.toThrow()
  })
})
