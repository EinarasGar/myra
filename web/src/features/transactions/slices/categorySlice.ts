import { createSlice } from "@reduxjs/toolkit";
import { myraApi } from "@/services/myra";
import { CategoryViewModel } from "@/models";
import { RootState } from "@/stores/store";

interface CategoryState {
  values: CategoryViewModel[];
}

const initialState: CategoryState = {
  values: [],
};

const categorySlice = createSlice({
  name: "transactionCategories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      myraApi.endpoints.getCategories.matchFulfilled,
      (state, { payload }) => {
        state.values = payload;
      }
    );
  },
});

// export const {} = categorySlice.actions;
export const selectTransactionCategories = (state: RootState) =>
  state.transcationCategories.values;

export default categorySlice.reducer;
