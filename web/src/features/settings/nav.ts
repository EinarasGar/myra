export const SETTINGS_SECTIONS = [
  "general",
  "accounts",
  "categories",
  "connections",
  "myra",
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export interface SettingsSectionMeta {
  readonly id: SettingsSection
  readonly label: string
  readonly title: string
  readonly intro: string
}

export const SETTINGS_SECTION_META: Record<
  SettingsSection,
  SettingsSectionMeta
> = {
  general: {
    id: "general",
    label: "General",
    title: "General",
    intro:
      "Your reference currency, appearance and account. Changing the base currency re-converts every derived number — balances, portfolio value, net worth — and touches no stored transaction.",
  },
  accounts: {
    id: "accounts",
    label: "Accounts",
    title: "Accounts",
    intro:
      "Every balance lives in an account. The type decides which group it is listed under and whether it counts as spendable; your share decides how much of it counts toward your net worth. Deactivating one leaves its transactions in the ledger.",
  },
  categories: {
    id: "categories",
    label: "Categories & assets",
    title: "Categories & assets",
    intro:
      "Categories are two levels: types hold categories. Sverto seeds the common ones — anything you add is marked yours and can be given any icon.",
  },
  connections: {
    id: "connections",
    label: "Connections",
    title: "Connections",
    intro:
      "Sverto imports from providers you connect. Nothing arrives until you bind a provider account to one of yours, and you choose whether imports post directly or wait for your review.",
  },
  myra: {
    id: "myra",
    label: "Myra",
    title: "Myra",
    intro:
      "Myra reads your ledger to answer questions and draft transactions. It never writes anything without your explicit approval. Usage is metered in tokens across two windows.",
  },
}

export const SETTINGS_SECTION_LIST: readonly SettingsSectionMeta[] =
  SETTINGS_SECTIONS.map((section) => SETTINGS_SECTION_META[section])
