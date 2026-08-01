import type { MockId } from "./registry"

export function areMockMarkersVisible(): boolean {
  return import.meta.env.VITE_HIDE_MOCK_MARKERS !== "true"
}

export function mockAttributes(id: MockId): Record<string, string> {
  return { "data-mock": id }
}

export function mockMarkerProps(id: MockId | null): Record<string, string> {
  if (id === null) return {}
  return { "data-mock": id, title: mockTitle(id) }
}

export function mockTitle(_id: MockId): string {
  return "Example figures — an illustration, not read from your ledger."
}
