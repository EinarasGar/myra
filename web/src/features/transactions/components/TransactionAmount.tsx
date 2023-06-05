import { useSelector } from "react-redux";
import { selectAssets } from "@/features/asset";
import { AssetViewModel } from "@/models";

export interface TransactionAmountProps {
  amounts: TransactionAmountData[];
}

export interface TransactionAmountData {
  assetId: number;
  quantity: number;
}

interface QuantityAssetPair {
  quantity: number;
  asset?: AssetViewModel;
}
function TransactionAmount({ amounts: transactions }: TransactionAmountProps) {
  const assets = useSelector(selectAssets);

  const acc: QuantityAssetPair[] = [];
  transactions.forEach((value) => {
    const i = acc.findIndex((x) => x.asset?.id === value.assetId);
    if (i > -1) acc[i].quantity += value.quantity;
    else
      acc.push({
        quantity: value.quantity,
        asset: assets.find((x) => x.id === value.assetId),
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
