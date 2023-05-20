import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { useTransactionRoutes } from "@/features/transactions";
import useAuthRotues from "@/features/auth/routes";
import { MainLayout } from "@/components";

function AppRoutes() {
  // could be useful
  // https://stackoverflow.com/questions/69864165/error-privateroute-is-not-a-route-component-all-component-children-of-rou

  const router = createBrowserRouter([
    {
      path: "/",
      element: <MainLayout />,
      children: [...useTransactionRoutes(), ...useAuthRotues()],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default AppRoutes;
