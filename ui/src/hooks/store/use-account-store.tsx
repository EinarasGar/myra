import {
  Account,
  AccountType,
  ExpandedAccount,
  LiquidityType,
} from "@/types/account";
import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface AccountsState {
  accounts: Account[];
  accountTypes: AccountType[];
  liquidityTypes: LiquidityType[];

  add: (accounts: Account[]) => void;
  addAccountType: (accountTypes: AccountType[]) => void;
  addLiquidityType: (liquidityTypes: LiquidityType[]) => void;
}

export const useAccountStore = create<AccountsState>((set) => ({
  accounts: [],
  accountTypes: [],
  liquidityTypes: [],
  add: (newAccounts) =>
    set((state) => ({
      ...state,
      accounts: [
        ...state.accounts,
        ...newAccounts.filter(
          (newAccount) =>
            !state.accounts.some((account) => account.id === newAccount.id),
        ),
      ],
    })),
  addAccountType: (newAccountTypes) =>
    set((state) => ({
      ...state,
      accountTypes: [
        ...state.accountTypes,
        ...newAccountTypes.filter(
          (newAccountType) =>
            !state.accountTypes.some(
              (accountType) => accountType.id === newAccountType.id,
            ),
        ),
      ],
    })),
  addLiquidityType: (newLiquidityTypes) =>
    set((state) => ({
      ...state,
      liquidityTypes: [
        ...state.liquidityTypes,
        ...newLiquidityTypes.filter(
          (newLiquidityType) =>
            !state.liquidityTypes.some(
              (liquidityType) => liquidityType.id === newLiquidityType.id,
            ),
        ),
      ],
    })),
}));

export const useExpandedAccounts = () => {
  const [accounts, accountTypes, liquidityTypes] = useAccountStore(
    useShallow((state) => [
      state.accounts,
      state.accountTypes,
      state.liquidityTypes,
    ]),
  );

  return useMemo(
    () => {
      return accounts.map(
        (account) =>
          ({
            id: account.id,
            name: account.name,
            accountType: accountTypes.find(
              (t) => t.id === account.account_type_id,
            ),
            liquidityType: liquidityTypes.find(
              (t) => t.id === account.liquidity_type_id,
            ),
          }) as ExpandedAccount,
      );
    },
    [accounts, accountTypes, liquidityTypes],
  );
};
