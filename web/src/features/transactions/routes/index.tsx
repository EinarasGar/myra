import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import AllTransactions from "./AllTransactions";
import AddTransaction from "./AddTransaction";
import { selectAuth } from "@/features/auth";

const useTransactionRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let transactionRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    transactionRoutes = [
      {
        path: "transactions",
        element: <AllTransactions />,
        // children: [
        //   {
        //     path: "add",
        //     element: <AddTransaction />,
        //   },
        // ],
      },
      {
        path: "transactions/add",
        element: <AddTransaction />,
      },
    ];
  }
  return transactionRoutes;
};

export default useTransactionRoutes;
