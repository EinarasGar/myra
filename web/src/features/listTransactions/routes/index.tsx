import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import AllTransactions from "./AllTransactions";
import { selectAuth } from "@/features/auth";
import Transaction from "./Transaction";

const useListTransactionRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let listTransactionRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    listTransactionRoutes = [
      {
        path: "transactions",
        element: <AllTransactions />,
      },
      {
        path: "transactions/:transactionId",
        element: <Transaction />,
      },
    ];
  }
  return listTransactionRoutes;
};

export default useListTransactionRoutes;
