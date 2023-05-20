// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  TransactionGroupListViewModel,
  CategoryViewModel,
  LoginDetailsViewModel,
  AuthViewModel,
} from "@/models";
import { RootState } from "@/stores/store";

// Define a service using a base URL and expected endpoints
export const myraApi = createApi({
  reducerPath: "myraApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      // By default, if we have a token in the store, let's use that for authenticated requests
      const { token } = (getState() as RootState).auth;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionGroupListViewModel, string>({
      query: () => `/users/2396480f-0052-4cf0-81dc-8cedbde5ce13/transactions`,
    }),
    getCategories: builder.query<CategoryViewModel[], void>({
      query: () => `/constants/categories`,
    }),
    login: builder.mutation<AuthViewModel, LoginDetailsViewModel>({
      query: (credentials) => ({
        url: "/auth",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  useGetTransactionsQuery,
  useGetCategoriesQuery,
  useLoginMutation,
} = myraApi;
