import { createSlice } from "@reduxjs/toolkit";
import { UserViewModel } from "@/models";
import { RootState } from "@/app/store";
import { myraApi } from "@/app/myraApi";

interface UserSate {
  currentUser?: UserViewModel;
}

const initialState: UserSate = {
  currentUser: undefined,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      myraApi.endpoints.getUser.matchFulfilled,
      (state, { payload }) => {
        state.currentUser = payload;
      }
    );
  },
});

export const selectCurrentUser = (state: RootState) => state.user.currentUser;

export default userSlice.reducer;
