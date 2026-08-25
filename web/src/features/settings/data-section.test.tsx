import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { IdentifiableExport } from "@/api"
import { formatBytes } from "@/features/uploads"
import { formatDateStamp } from "@/lib/format"

const getMe = vi.fn()
const listExports = vi.fn()
const createExport = vi.fn()
const getFileUrl = vi.fn()

const ENDPOINTS: Record<string, unknown> = {
  getMe,
  listExports,
  createExport,
  getFileUrl,
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
  apiClient: { get: vi.fn(() => Promise.resolve({ data: {} })) },
}))

const { SettingsScreen } = await import("./settings-screen")
const { renderSettings, stubViewport, VIEWPORTS } =
  await import("./test-harness")

const TEST_USER_ID = "00000000-0000-0000-0000-000000000000"

function exportRow(overrides: Partial<IdentifiableExport> = {}): IdentifiableExport {
  return {
    id: "exp-1",
    created_at: "2024-05-01T12:00:00Z",
    format: "csv",
    size_bytes: 2048,
    ...overrides,
  }
}

function consequence(row: IdentifiableExport): string {
  return `${formatDateStamp(row.created_at, { year: "always" })} · ${formatBytes(row.size_bytes)}`
}

beforeEach(() => {
  vi.clearAllMocks()
  stubViewport(VIEWPORTS.full)
  getMe.mockResolvedValue({
    data: {
      user_id: TEST_USER_ID,
      role: "user",
      onboarding_version: 1,
      default_asset: { id: 1, ticker: "GBP", name: "British Pound" },
      user_metadata: { username: "einaras" },
    },
  })
  listExports.mockResolvedValue({ data: { exports: [] } })
  createExport.mockResolvedValue({ data: exportRow() })
  getFileUrl.mockResolvedValue({
    data: {
      expires_in_seconds: 60,
      media_type: "text/csv",
      url: "https://files.example/export.csv",
    },
  })
})

afterEach(cleanup)

describe("the data export block", () => {
  it("fires the create export mutation with the csv format", async () => {
    await renderSettings(<SettingsScreen section="data" />)
    fireEvent.click(await screen.findByRole("button", { name: "Export CSV" }))

    await waitFor(() => {
      expect(createExport).toHaveBeenCalledWith(TEST_USER_ID, {
        format: "csv",
      })
    })
  })
})

describe("previous exports", () => {
  it("lists each export row with its format label, date and size", async () => {
    const csv = exportRow({
      id: "exp-csv",
      format: "csv",
      created_at: "2024-05-01T12:00:00Z",
      size_bytes: 2048,
    })
    const bean = exportRow({
      id: "exp-bean",
      format: "beancount",
      created_at: "2023-11-10T12:00:00Z",
      size_bytes: 1_572_864,
    })
    listExports.mockResolvedValue({ data: { exports: [csv, bean] } })

    await renderSettings(<SettingsScreen section="data" />)

    expect(await screen.findByText(consequence(csv))).toBeInTheDocument()
    expect(screen.getByText(consequence(bean))).toBeInTheDocument()
    expect(screen.getAllByText("CSV", { exact: true }).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText("Beancount", { exact: true }).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(2)
  })

  it("downloads an export by fetching its url and following it", async () => {
    const assign = vi.fn()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    })
    const row = exportRow({
      id: "exp-1",
      format: "csv",
      created_at: "2024-05-01T12:00:00Z",
      size_bytes: 2048,
    })
    listExports.mockResolvedValue({ data: { exports: [row] } })

    await renderSettings(<SettingsScreen section="data" />)
    fireEvent.click(await screen.findByRole("button", { name: "Download" }))

    await waitFor(() => {
      expect(getFileUrl).toHaveBeenCalledWith(TEST_USER_ID, "exp-1")
    })
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://files.example/export.csv")
    })
  })
})
