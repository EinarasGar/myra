import { configureStore } from "@reduxjs/toolkit";
import { myraApi } from "@/app/myraApi";
import { assetReducer } from "@/features/asset";
import { authReducer } from "@/features/auth";
import { userReducer } from "@/features/user";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    auth: authReducer,
    user: userReducer,
    [myraApi.reducerPath]: myraApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(myraApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
