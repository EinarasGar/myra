import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { AssetViewModel } from "../../models/asset_view_model";

export interface AssetState {
  assets: AssetViewModel[];
}

const initialState: AssetState = {
  assets: [],
};

export const counterSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    insertNew: (state, action: PayloadAction<AssetViewModel[]>) => {
      state.assets = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { insertNew } = counterSlice.actions;

export default counterSlice.reducer;
