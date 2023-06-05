import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import AddTransaction from "./AddTransaction";
import { selectAuth } from "@/features/auth";

const useAddTransactionRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let addTransactionRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    addTransactionRoutes = [
      {
        path: "transactions/add",
        element: <AddTransaction />,
      },
    ];
  }
  return addTransactionRoutes;
};

export default useAddTransactionRoutes;
