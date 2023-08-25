import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuth } from "@/features/auth";
import Portfolio from "./Portfolio";

const usePortfolioOverviewRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let portfolioOverviewRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    portfolioOverviewRoutes = [
      {
        path: "portfolio",
        element: <Portfolio />,
      },
    ];
  }
  return portfolioOverviewRoutes;
};

export default usePortfolioOverviewRoutes;
