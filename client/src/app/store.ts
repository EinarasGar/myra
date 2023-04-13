import { configureStore } from "@reduxjs/toolkit";
import assetSlice from "../features/asset/assetSlice";
import transactionSlice from "../features/transaction/transactionSlice";

export const store = configureStore({
  reducer: {
    asset: assetSlice,
    transaction: transactionSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
