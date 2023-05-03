import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { TransactionGroupViewModel } from "../../models/transaction_view_model/get_tramscaton_view_model";

export interface TransactionState {
  transactionGroups: Array<TransactionGroupViewModel>;
}

const initialState: TransactionState = {
  transactionGroups: [],
};

export const counterSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    insertNewTransactions: (
      state,
      action: PayloadAction<TransactionGroupViewModel[]>
    ) => {
      state.transactionGroups = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { insertNewTransactions } = counterSlice.actions;

export default counterSlice.reducer;
