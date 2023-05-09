import { useSelector } from "react-redux";
import { selectAssets } from "@/features/asset";
import { AssetViewModel, TransactionViewModel } from "@/models";

export interface TransactionAmountProps {
  transactions: TransactionViewModel[];
}

interface QuantityAssetPair {
  quantity: number;
  asset?: AssetViewModel;
}
function TransactionAmount({ transactions }: TransactionAmountProps) {
  const assets = useSelector(selectAssets);

  const acc: QuantityAssetPair[] = [];
  transactions.forEach((value) => {
    const i = acc.findIndex((x) => x.asset?.id === value.asset_id);
    if (i > -1) acc[i].quantity += value.quantity;
    else
      acc.push({
        quantity: value.quantity,
        asset: assets.find((x) => x.id === value.asset_id),
      });
  });
  return (
    <div>
      {acc.map((pair) => (
        <span key={pair.asset?.id}>
          {pair.quantity} {pair.asset?.ticker}
        </span>
      ))}
    </div>
  );
}

export default TransactionAmount;
