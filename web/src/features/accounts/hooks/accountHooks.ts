import { skipToken } from "@reduxjs/toolkit/dist/query";
import { useGetUserQuery } from "@/app/myraApi";
import { selectUserId } from "@/features/auth/authSlice";
import { useAppSelector } from "@/hooks";

export function useAccounts() {
  const userId = useAppSelector(selectUserId);
  const ret = useGetUserQuery(userId || skipToken);
  return {
    ...ret,
    data: ret.data?.portfolio_accounts,
    currentData: ret.currentData?.portfolio_accounts,
  };
}
