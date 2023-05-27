import { createSlice } from "@reduxjs/toolkit";
import { myraApi } from "@/app/myraApi";
import { RootState } from "@/app/store";
import { storage, decodeJwtToken } from "./utils";

interface AuthState {
  token?: string;
  userId?: string;
  expiration?: number;
  role?: string;
}

function getStateFromToken(newToken: string): AuthState {
  let returnState: AuthState = {};
  if (newToken) {
    const jwtData = decodeJwtToken(newToken);
    returnState = {
      token: newToken,
      userId: jwtData.sub,
      expiration: jwtData.exp,
      role: jwtData.role,
    };
  }
  return returnState;
}

const initialState: AuthState = getStateFromToken(storage.getToken());

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      myraApi.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        storage.setToken(payload.token);
        state = getStateFromToken(payload.token);
      }
    );
  },
});

export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectUserId = (state: RootState) => state.auth.userId;

export default authSlice.reducer;
