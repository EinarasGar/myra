// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { TransactionGroupListViewModel, CategoryViewModel } from "@/models";

// Define a service using a base URL and expected endpoints
export const myraApi = createApi({
  reducerPath: "myraApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "",
  }),
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionGroupListViewModel, string>({
      query: () => `/users/2396480f-0052-4cf0-81dc-8cedbde5ce13/transactions`,
    }),
    getCategories: builder.query<CategoryViewModel[], void>({
      query: () => `/constants/categories`,
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetTransactionsQuery, useGetCategoriesQuery } = myraApi;
