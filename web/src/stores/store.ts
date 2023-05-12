import { configureStore } from "@reduxjs/toolkit";
import { myraApi } from "@/services/myra";
import { assetReducer } from "@/features/asset";
import { categoriesReducer } from "@/features/transactions";

export const store = configureStore({
  reducer: {
    asset: assetReducer,
    transcationCategories: categoriesReducer,
    [myraApi.reducerPath]: myraApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(myraApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
