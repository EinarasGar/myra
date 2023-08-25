// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  TransactionGroupListViewModel,
  CategoryViewModel,
  LoginDetailsViewModel,
  AuthViewModel,
  AssetViewModel,
  UserViewModel,
  PortfolioAccountViewModel,
  AddTransactionGroupViewModel,
  UpdateTransactionGroupViewModel,
  PortfolioViewModel,
} from "@/models";
import { RootState } from "@/app/store";

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
    searchAssets: builder.query<AssetViewModel[], string>({
      query: (query) => `/assets?search=${query}`,
    }),
    getUser: builder.query<UserViewModel, string>({
      query: (uuid) => `/users/${uuid}`,
    }),
    getPortfolio: builder.query<PortfolioViewModel, string>({
      query: (uuid) => `/users/2396480f-0052-4cf0-81dc-8cedbde5ce13/portfolio`,
    }),
    postAccount: builder.mutation<
      PortfolioAccountViewModel,
      { account: PortfolioAccountViewModel; user_id: string }
    >({
      query: ({ account, user_id }) => ({
        url: `/users/${user_id}/portfolio/accounts`,
        method: "POST",
        body: account,
      }),
      async onQueryStarted({ user_id }, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedPost } = await queryFulfilled;
          const update = myraApi.util.updateQueryData(
            "getUser",
            user_id,
            (draft) => {
              draft.portfolio_accounts.push(updatedPost);
            }
          );
          dispatch(update);
        } catch {
          // Ignore error
        }
      },
    }),
    postTransactionGroup: builder.mutation<
      TransactionGroupListViewModel,
      { group: AddTransactionGroupViewModel; user_id: string }
    >({
      query: ({ group, user_id }) => ({
        url: `/users/${user_id}/transactions`,
        method: "POST",
        body: group,
      }),
    }),
    postTransactionGroupById: builder.mutation<
      TransactionGroupListViewModel,
      { group: UpdateTransactionGroupViewModel; user_id: string }
    >({
      query: ({ group, user_id }) => ({
        url: `/users/${user_id}/transactions/${group.id}`,
        method: "POST",
        body: group,
      }),
    }),
    deleteTransactionGroupById: builder.mutation<
      void,
      { user_id: string; group_id: string }
    >({
      query: ({ group_id, user_id }) => ({
        url: `/users/${user_id}/transactions/${group_id}`,
        method: "DELETE",
      }),
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
  useSearchAssetsQuery,
  useGetUserQuery,
  usePostAccountMutation,
  usePostTransactionGroupMutation,
  usePostTransactionGroupByIdMutation,
  useDeleteTransactionGroupByIdMutation,
  useGetPortfolioQuery,
} = myraApi;
