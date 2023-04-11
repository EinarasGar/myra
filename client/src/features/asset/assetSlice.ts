import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { AssetsLookupTable } from "../../models/transaction_view_model";

export interface AssetState {
  assets: AssetsLookupTable[];
}

const initialState: AssetState = {
  assets: [],
};

export const counterSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    insertNew: (state, action: PayloadAction<AssetsLookupTable[]>) => {
      state.assets = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { insertNew } = counterSlice.actions;

export default counterSlice.reducer;
