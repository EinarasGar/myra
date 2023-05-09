import { createBrowserRouter } from "react-router-dom";
import { TransactionRoutes } from "@/features/transactions";

const router = createBrowserRouter([
  {
    path: "/transactions/*",
    element: <TransactionRoutes />,
  },
  {
    path: "/test",
    element: <span> test</span>,
  },
]);

export default router;
