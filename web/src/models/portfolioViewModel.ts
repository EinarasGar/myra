import { PortfolioEntryViewModel } from "./portfolioEntryViewModel";
import { AssetViewModel } from "./assetViewModel";
import { paths } from "./schema";

export type PortfolioViewModel =
  paths["/api/users/:user_id/portfolio/holdings"]["get"]["responses"]["200"]["content"]["application/json"];

export type PortfolioOverviewViewModel =
  paths["/api/users/:user_id/portfolio/overview"]["get"]["responses"]["200"]["content"]["application/json"];
