import { useMemo, type ReactNode } from "react";
import { useAuthUserId } from "@/hooks/use-auth";
import useGetAccountPortfolioOverview from "@/hooks/api/use-get-account-portfolio-overview";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InvestmentSummaryCardProps {
  accountId: string;
}

function ValueDisplay({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span
      className={cn(
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {Number(value).toFixed(2)}
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
  const userId = useAuthUserId();
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
    const totalValue = totalCostBasis + unrealizedGain + cashValue;
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
            <span>{Number(summary.totalValue).toFixed(2)}</span>
          </SummaryItem>
          <SummaryItem label="Total Cost Basis">
            <span>{Number(summary.totalCostBasis).toFixed(2)}</span>
          </SummaryItem>
          <SummaryItem label="Unrealized Gain/Loss">
            <span className="flex items-baseline gap-2">
              <ValueDisplay value={summary.unrealizedGain} />
              <span className="text-sm font-normal">
                (<ValueDisplay value={summary.unrealizedPct} suffix="%" />)
              </span>
            </span>
          </SummaryItem>
          <SummaryItem label="Total Dividends">
            <span>{Number(summary.totalDividends).toFixed(2)}</span>
          </SummaryItem>
        </div>
      </CardContent>
    </Card>
  );
}
