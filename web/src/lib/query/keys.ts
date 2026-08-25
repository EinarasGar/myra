export type UserId = string
export type AccountId = string
export type AssetId = number
export type CategoryId = number
export type CategoryTypeId = number
export type TransactionId = string
export type TransactionGroupId = string
export type ConversationId = string
export type QuickUploadId = string
export type FileId = string
export type ConnectionId = string
export type BindingId = string
export type ProviderAccountId = string

export type PortfolioRange = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "all"

export interface CursorPageParams {
  limit: number
  query?: string
}

export interface OffsetPageParams {
  count: number
  query?: string
}

export interface AssetSearchParams extends OffsetPageParams {
  assetType?: number
}

export interface CategorySearchParams extends OffsetPageParams {
  typeId?: CategoryTypeId
}

export interface DenominatedParams {
  defaultAssetId: AssetId
}

export interface HoldingsParams extends DenominatedParams {
  applyOwnershipShare: boolean
}

export interface HistoryParams extends DenominatedParams {
  range: PortfolioRange
}

export interface RatesParams {
  range: PortfolioRange
}

const AUTH = ["auth"] as const
const REFERENCE = ["reference"] as const
const USER = ["user"] as const

export const queryKeys = {
  auth: {
    all: () => AUTH,
    me: () => [...AUTH, "me"] as const,
  },

  reference: {
    all: () => REFERENCE,
    accountTypes: () => [...REFERENCE, "account-types"] as const,
    accountLiquidityTypes: () =>
      [...REFERENCE, "account-liquidity-types"] as const,
    assetTypes: () => [...REFERENCE, "asset-types"] as const,
    categoryTypes: () => [...REFERENCE, "category-types"] as const,

    assets: {
      all: () => [...REFERENCE, "assets"] as const,
      search: (params: AssetSearchParams) =>
        [...REFERENCE, "assets", "search", params] as const,
      detail: (assetId: AssetId) =>
        [...REFERENCE, "assets", "detail", assetId] as const,
      pair: (assetId: AssetId, referenceId: AssetId) =>
        [
          ...REFERENCE,
          "assets",
          "detail",
          assetId,
          "pair",
          referenceId,
        ] as const,
      pairRates: (
        assetId: AssetId,
        referenceId: AssetId,
        params: RatesParams
      ) =>
        [
          ...REFERENCE,
          "assets",
          "detail",
          assetId,
          "pair",
          referenceId,
          "rates",
          params,
        ] as const,
      converted: (assetId: AssetId, referenceId: AssetId) =>
        [
          ...REFERENCE,
          "assets",
          "detail",
          assetId,
          "pair",
          referenceId,
          "converted",
        ] as const,
      convertedRates: (
        assetId: AssetId,
        referenceId: AssetId,
        params: RatesParams
      ) =>
        [
          ...REFERENCE,
          "assets",
          "detail",
          assetId,
          "pair",
          referenceId,
          "converted",
          "rates",
          params,
        ] as const,
    },

    categories: {
      all: () => [...REFERENCE, "categories"] as const,
      search: (params: CategorySearchParams) =>
        [...REFERENCE, "categories", "search", params] as const,
    },
  },

  user: (userId: UserId) => {
    const root = [...USER, userId] as const

    const accountsRoot = [...root, "accounts"] as const
    const transactionsRoot = [...root, "transactions"] as const
    const portfolioRoot = [...root, "portfolio"] as const
    const assetsRoot = [...root, "assets"] as const
    const categoriesRoot = [...root, "categories"] as const
    const aiRoot = [...root, "ai"] as const
    const filesRoot = [...root, "files"] as const
    const connectorsRoot = [...root, "connectors"] as const

    return {
      all: () => root,

      accounts: {
        all: () => accountsRoot,
        list: () => [...accountsRoot, "list"] as const,
        detail: (accountId: AccountId) =>
          [...accountsRoot, "detail", accountId] as const,
        portfolioOverview: (accountId: AccountId, params: DenominatedParams) =>
          [
            ...accountsRoot,
            "detail",
            accountId,
            "portfolio",
            "overview",
            params,
          ] as const,
        portfolioHistory: (accountId: AccountId, params: HistoryParams) =>
          [
            ...accountsRoot,
            "detail",
            accountId,
            "portfolio",
            "history",
            params,
          ] as const,
        transactions: (accountId: AccountId, params: OffsetPageParams) =>
          [
            ...accountsRoot,
            "detail",
            accountId,
            "transactions",
            params,
          ] as const,
      },

      transactions: {
        all: () => transactionsRoot,
        combined: (params: CursorPageParams) =>
          [...transactionsRoot, "combined", params] as const,
        individual: {
          all: () => [...transactionsRoot, "individual"] as const,
          list: (params: CursorPageParams) =>
            [...transactionsRoot, "individual", "list", params] as const,
          detail: (transactionId: TransactionId) =>
            [
              ...transactionsRoot,
              "individual",
              "detail",
              transactionId,
            ] as const,
        },
        groups: {
          all: () => [...transactionsRoot, "groups"] as const,
          list: (params: CursorPageParams) =>
            [...transactionsRoot, "groups", "list", params] as const,
        },
      },

      portfolio: {
        all: () => portfolioRoot,
        holdings: (params: HoldingsParams) =>
          [...portfolioRoot, "holdings", params] as const,
        history: (params: HistoryParams) =>
          [...portfolioRoot, "history", params] as const,
        overview: (params: DenominatedParams) =>
          [...portfolioRoot, "overview", params] as const,
        assetOverview: (assetId: AssetId, params: DenominatedParams) =>
          [...portfolioRoot, "assets", assetId, "overview", params] as const,
      },

      assets: {
        all: () => assetsRoot,
        list: () => [...assetsRoot, "list"] as const,
        detail: (assetId: AssetId) =>
          [...assetsRoot, "detail", assetId] as const,
        pair: (assetId: AssetId, referenceId: AssetId) =>
          [...assetsRoot, "detail", assetId, "pair", referenceId] as const,
        pairRates: (
          assetId: AssetId,
          referenceId: AssetId,
          params: RatesParams
        ) =>
          [
            ...assetsRoot,
            "detail",
            assetId,
            "pair",
            referenceId,
            "rates",
            params,
          ] as const,
        converted: (assetId: AssetId, referenceId: AssetId) =>
          [
            ...assetsRoot,
            "detail",
            assetId,
            "pair",
            referenceId,
            "converted",
          ] as const,
        convertedRates: (
          assetId: AssetId,
          referenceId: AssetId,
          params: RatesParams
        ) =>
          [
            ...assetsRoot,
            "detail",
            assetId,
            "pair",
            referenceId,
            "converted",
            "rates",
            params,
          ] as const,
      },

      categories: {
        all: () => categoriesRoot,
        list: () => [...categoriesRoot, "list"] as const,
        detail: (categoryId: CategoryId) =>
          [...categoriesRoot, "detail", categoryId] as const,
        types: () => [...categoriesRoot, "types"] as const,
      },

      ai: {
        all: () => aiRoot,
        usage: () => [...aiRoot, "usage"] as const,
        conversations: {
          all: () => [...aiRoot, "conversations"] as const,
          list: () => [...aiRoot, "conversations", "list"] as const,
          detail: (conversationId: ConversationId) =>
            [...aiRoot, "conversations", "detail", conversationId] as const,
          messages: (conversationId: ConversationId) =>
            [
              ...aiRoot,
              "conversations",
              "detail",
              conversationId,
              "messages",
            ] as const,
        },
        quickUploads: {
          all: () => [...aiRoot, "quick-uploads"] as const,
          list: () => [...aiRoot, "quick-uploads", "list"] as const,
          detail: (quickUploadId: QuickUploadId) =>
            [...aiRoot, "quick-uploads", "detail", quickUploadId] as const,
        },
      },

      files: {
        all: () => filesRoot,
        detail: (fileId: FileId) => [...filesRoot, "detail", fileId] as const,
        url: (fileId: FileId) =>
          [...filesRoot, "detail", fileId, "url"] as const,
        thumbnail: (fileId: FileId) =>
          [...filesRoot, "detail", fileId, "thumbnail"] as const,
      },

      connectors: {
        all: () => connectorsRoot,
        aspsps: {
          all: () => [...connectorsRoot, "aspsps"] as const,
          list: (providerKind: string, country: string | null) =>
            [
              ...connectorsRoot,
              "aspsps",
              "list",
              providerKind,
              country ?? "none",
            ] as const,
        },
        connections: {
          all: () => [...connectorsRoot, "connections"] as const,
          list: () => [...connectorsRoot, "connections", "list"] as const,
          detail: (connectionId: ConnectionId) =>
            [...connectorsRoot, "connections", "detail", connectionId] as const,
          providerAccounts: (connectionId: ConnectionId) =>
            [
              ...connectorsRoot,
              "connections",
              "detail",
              connectionId,
              "provider-accounts",
            ] as const,
          providerAccountTransactions: (
            connectionId: ConnectionId,
            providerAccountId: ProviderAccountId
          ) =>
            [
              ...connectorsRoot,
              "connections",
              "detail",
              connectionId,
              "provider-accounts",
              providerAccountId,
              "transactions",
            ] as const,
        },
        bindings: {
          all: () => [...connectorsRoot, "bindings"] as const,
          list: () => [...connectorsRoot, "bindings", "list"] as const,
          detail: (bindingId: BindingId) =>
            [...connectorsRoot, "bindings", "detail", bindingId] as const,
          syncCheckpoint: (bindingId: BindingId) =>
            [
              ...connectorsRoot,
              "bindings",
              "detail",
              bindingId,
              "sync-checkpoint",
            ] as const,
        },
      },
    }
  },
} as const

export const mutationKeys = {
  user: (userId: UserId) => ({
    accounts: () => ["mutate", "user", userId, "accounts"] as const,
    categories: () => ["mutate", "user", userId, "categories"] as const,
    categoryTypes: () => ["mutate", "user", userId, "category-types"] as const,
    transactions: () => ["mutate", "user", userId, "transactions"] as const,
    assets: () => ["mutate", "user", userId, "assets"] as const,
    connectors: () => ["mutate", "user", userId, "connectors"] as const,
    ai: () => ["mutate", "user", userId, "ai"] as const,
    files: () => ["mutate", "user", userId, "files"] as const,
    account: () => ["mutate", "user", userId, "account"] as const,
  }),
} as const
