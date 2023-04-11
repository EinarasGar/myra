import { configureStore } from "@reduxjs/toolkit";
import assetSlice from "../features/asset/assetSlice";

export const store = configureStore({
  reducer: {
    asset: assetSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
