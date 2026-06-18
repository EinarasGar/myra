import { useMemo, type ReactNode } from "react";
import { useUserId, useDefaultAssetTicker } from "@/hooks/use-auth";
import useGetAccountPortfolioOverview from "@/hooks/api/use-get-account-portfolio-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

interface InvestmentSummaryCardProps {
  accountId: string;
}

function ValueDisplay({
  value,
  suffix,
  baseTicker,
  signed,
}: {
  value: number;
  suffix?: string;
  baseTicker?: string;
  signed?: boolean;
}) {
  return (
    <span
      className={cn(
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {baseTicker !== undefined
        ? formatMoney(Number(value), baseTicker, signed)
        : Number(value).toFixed(2)}
      {suffix}
    </span>
  );
}

interface SummaryItemProps {
  label: string;
  children: ReactNode;
}

function SummaryItem({ label, children }: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{children}</span>
    </div>
  );
}

export default function InvestmentSummaryCard({
  accountId,
}: InvestmentSummaryCardProps) {
  const userId = useUserId();
  const baseTicker = useDefaultAssetTicker() ?? "";
  const { data } = useGetAccountPortfolioOverview(userId, accountId);

  const summary = useMemo(() => {
    const assetPortfolios = data.asset_portfolios ?? [];
    const cashPortfolios = data.cash_portfolios ?? [];

    const totalCostBasis = assetPortfolios.reduce(
      (sum, p) => sum + p.total_cost_basis,
      0,
    );
    const unrealizedGain = assetPortfolios.reduce(
      (sum, p) => sum + p.unrealized_gains,
      0,
    );
    const cashValue = cashPortfolios.reduce((sum, p) => sum + p.units, 0);
    // Market value of remaining holdings + cash. Summing cost basis + unrealized
    // gain would keep the basis of already-sold units and overstate the total.
    const marketValue = assetPortfolios.reduce(
      (sum, p) => sum + p.market_value,
      0,
    );
    const totalValue = marketValue + cashValue;
    const unrealizedPct =
      totalCostBasis !== 0 ? (unrealizedGain / totalCostBasis) * 100 : 0;
    const totalDividends = cashPortfolios.reduce(
      (sum, p) => sum + p.dividends,
      0,
    );

    return {
      totalValue,
      totalCostBasis,
      unrealizedGain,
      unrealizedPct,
      totalDividends,
    };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <SummaryItem label="Total Value">
            <span>{formatMoney(Number(summary.totalValue), baseTicker)}</span>
          </SummaryItem>
          <SummaryItem label="Total Cost Basis">
            <span>
              {formatMoney(Number(summary.totalCostBasis), baseTicker)}
            </span>
          </SummaryItem>
          <SummaryItem label="Unrealized Gain/Loss">
            <span className="flex items-baseline gap-2">
              <ValueDisplay
                value={summary.unrealizedGain}
                baseTicker={baseTicker}
                signed
              />
              <span className="text-sm font-normal">
                (<ValueDisplay value={summary.unrealizedPct} suffix="%" />)
              </span>
            </span>
          </SummaryItem>
          <SummaryItem label="Total Dividends">
            <span>
              {formatMoney(Number(summary.totalDividends), baseTicker)}
            </span>
          </SummaryItem>
        </div>
      </CardContent>
    </Card>
  );
}
