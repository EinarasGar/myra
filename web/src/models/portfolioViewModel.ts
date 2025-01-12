import { PortfolioEntryViewModel } from "./portfolioEntryViewModel";
import { AssetViewModel } from "./assetViewModel";
import { paths } from "./schema";

export type PortfolioViewModel =
  paths["/api/users/:user_id/portfolio/holdings"]["get"]["responses"]["200"]["content"]["application/json"];
