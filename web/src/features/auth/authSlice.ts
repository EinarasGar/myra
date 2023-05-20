import { createSlice } from "@reduxjs/toolkit";
import { myraApi } from "@/services/myra";
import { RootState } from "@/stores/store";
import storage from "./utils";

interface AuthSate {
  token?: string;
}

const initialState: AuthSate = {
  token: storage.getToken(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      myraApi.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        storage.setToken(payload.token);
        state.token = payload.token;
      }
    );
  },
});

export const selectAuth = (state: RootState) => state.auth.token;

export default authSlice.reducer;
