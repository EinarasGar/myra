import { Account } from "@/types/account";
import { create } from "zustand";

interface AccountsState {
  accounts: Account[];
  add: (accounts: Account[]) => void;
}

export const useAccountStore = create<AccountsState>((set) => ({
  accounts: [],
  add: (newAccounts) =>
    set((state) => ({
      ...state,
      accounts: [
        ...state.accounts,
        ...newAccounts.filter(
          (newAccount) =>
            !state.accounts.some((account) => account.id === newAccount.id)
        ),
      ],
    })),
}));
