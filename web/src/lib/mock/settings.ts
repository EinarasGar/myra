export interface MockMyraPermissions {
  quickUploadEnabled: boolean
  useHistoryForSuggestions: boolean
}

export const MOCK_MYRA_PERMISSIONS: MockMyraPermissions = {
  quickUploadEnabled: true,
  useHistoryForSuggestions: true,
}

const CONNECTION_IMPORT_TOTALS: Record<string, number> = {
  "lloyds bank": 1284,
  "starling bank": 402,
  "trading 212": 214,
  monzo: 96,
}

export function mockConnectionImportTotal(
  connectionName: string
): number | null {
  const key = connectionName.trim().toLowerCase().replace(/\s+/g, " ")
  return CONNECTION_IMPORT_TOTALS[key] ?? null
}

export const MOCK_CONNECTION_IMPORT_TOTALS: Readonly<Record<string, number>> =
  CONNECTION_IMPORT_TOTALS
