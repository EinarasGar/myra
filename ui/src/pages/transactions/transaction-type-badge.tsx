import { Badge } from "@/components/ui/badge";
import { getTransactionTypeLabel } from "./transaction-display-utils";

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  asset_purchase: "default",
  asset_sale: "destructive",
  cash_transfer_in: "default",
  cash_transfer_out: "destructive",
  cash_dividend: "secondary",
  asset_dividend: "secondary",
  asset_trade: "outline",
  asset_transfer_in: "default",
  asset_transfer_out: "destructive",
  asset_balance_transfer: "outline",
  account_fees: "destructive",
  regular: "secondary",
};

interface TransactionTypeBadgeProps {
  type: string;
}

export default function TransactionTypeBadge({
  type,
}: TransactionTypeBadgeProps) {
  const variant = TYPE_VARIANTS[type] ?? "secondary";
  return <Badge variant={variant}>{getTransactionTypeLabel(type)}</Badge>;
}
