import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectAuth } from "@/features/auth";
import AssetPair from "./AssetPair";

const useAssetsRoutes = () => {
  const isLoggedIn = useSelector(selectAuth);
  let portfolioOverviewRoutes: RouteObject[] = [];
  if (isLoggedIn) {
    portfolioOverviewRoutes = [
      {
        path: "assets/:id1/:id2",
        element: <AssetPair />,
      },
    ];
  }
  return portfolioOverviewRoutes;
};

export default useAssetsRoutes;
