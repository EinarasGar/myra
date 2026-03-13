export const TransactionTypes = {
  REGULAR_TRANSACTION: {
    label: "Regular Transaction",
    key: "regular_transaction",
  },
  ASSET_PURCHASE: {
    label: "Asset Purchase",
    key: "asset_purchase",
  },
  ASSET_SALE: {
    label: "Asset Sale",
    key: "asset_sale",
  },
  ASSET_DIVIDEND: {
    label: "Asset Dividend",
    key: "asset_dividend",
  },
  ASSET_BALANCE_TRANSFER: {
    label: "Asset Balance Transfer",
    key: "asset_balance_transfer",
  },
  ASSET_TRADE: {
    label: "Asset Trade",
    key: "asset_trade",
  },
  ASSET_TRANSFER_IN: {
    label: "Asset Transfer In",
    key: "asset_transfer_in",
  },
  ASSET_TRANSFER_OUT: {
    label: "Asset Transfer Out",
    key: "asset_transfer_out",
  },
  CASH_TRANSFER_IN: {
    label: "Cash Transfer In",
    key: "cash_transfer_in",
  },
  CASH_TRANSFER_OUT: {
    label: "Cash Transfer Out",
    key: "cash_transfer_out",
  },
  CASH_DIVIDEND: {
    label: "Cash Dividend",
    key: "cash_dividend",
  },
  ACCOUNT_FEES: {
    label: "Account Fees",
    key: "account_fees",
  },
};

export interface TransactionTypeDefinition {
  key: string;
  label: string;
  description: string;
}

export interface TransactionTypeGroup {
  label: string;
  types: TransactionTypeDefinition[];
}

export const TransactionTypeGroups: TransactionTypeGroup[] = [
  {
    label: "Everyday",
    types: [
      {
        key: "regular_transaction",
        label: "Purchase",
        description: "Buy goods or services",
      },
      {
        key: "account_fees",
        label: "Account Fees",
        description: "Service or maintenance fees",
      },
    ],
  },
  {
    label: "Investments",
    types: [
      {
        key: "asset_purchase",
        label: "Buy Asset",
        description: "Purchase stocks, ETFs, crypto",
      },
      {
        key: "asset_sale",
        label: "Sell Asset",
        description: "Sell holdings for cash",
      },
      {
        key: "asset_trade",
        label: "Trade Assets",
        description: "Swap one asset for another",
      },
      {
        key: "cash_dividend",
        label: "Cash Dividend",
        description: "Receive dividend in cash",
      },
      {
        key: "asset_dividend",
        label: "Asset Dividend",
        description: "Receive dividend in shares",
      },
      {
        key: "asset_balance_transfer",
        label: "Balance Transfer",
        description: "Move asset balance between accounts",
      },
    ],
  },
  {
    label: "Transfers",
    types: [
      {
        key: "cash_transfer_in",
        label: "Cash In",
        description: "Deposit cash into account",
      },
      {
        key: "cash_transfer_out",
        label: "Cash Out",
        description: "Withdraw cash from account",
      },
      {
        key: "asset_transfer_in",
        label: "Asset Transfer In",
        description: "Receive assets into account",
      },
      {
        key: "asset_transfer_out",
        label: "Asset Transfer Out",
        description: "Send assets from account",
      },
    ],
  },
];
