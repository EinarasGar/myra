import { createSlice } from "@reduxjs/toolkit";
import { myraApi } from "@/services/myra";
import { AssetViewModel } from "@/models";
import { RootState } from "@/stores/store";
// import type { RootState } from "@/stores/store";

// Define a type for the slice state
interface AssetState {
  values: AssetViewModel[];
}

// Define the initial state using that type
const initialState: AssetState = {
  values: [],
};

function insertAndSortAssets(
  curreentAssets: AssetViewModel[],
  newAssets: AssetViewModel[]
): AssetViewModel[] {
  const existingAssetIds = new Set(curreentAssets.map((asset) => asset.id));
  const uniqueAssets = newAssets.filter(
    (asset) => !existingAssetIds.has(asset.id)
  );

  const combinedList = [...curreentAssets, ...uniqueAssets];
  return combinedList.sort((a, b) => (a.category < b.category ? -1 : 1));
}

export const assetSlice = createSlice({
  name: "asset",
  initialState,
  reducers: {
    // insertNew: (state, action: PayloadAction<AssetViewModel[]>) => {
    //   state.values = action.payload;
    // },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        myraApi.endpoints.getTransactions.matchFulfilled,
        (state, { payload }) => {
          state.values = insertAndSortAssets(
            state.values,
            payload.assets_lookup_table
          );
        }
      )
      .addMatcher(
        myraApi.endpoints.searchAssets.matchFulfilled,
        (state, { payload }) => {
          state.values = insertAndSortAssets(state.values, payload);
        }
      );
  },
});

// export const { insertNew } = assetSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectAssets = (state: RootState) => state.asset.values;

export default assetSlice.reducer;
