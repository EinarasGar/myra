import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import AddTransaction from "./AddTransaction";
import { selectAuth } from "@/features/auth";
import EditTransactions from "./EditTransactions";

const useAddTransactionRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let addTransactionRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    addTransactionRoutes = [
      {
        path: "transactions/add",
        element: <AddTransaction />,
      },
      {
        path: "transactions/:transactionId/edit",
        element: <EditTransactions />,
      },
    ];
  }
  return addTransactionRoutes;
};

export default useAddTransactionRoutes;
