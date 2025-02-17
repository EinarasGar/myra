import { useAssetStore } from "@/hooks/use-asset-store";
import { Transaction } from "./individual-transactions-table";

interface TransactionConverterProps {
  type: string;
  description?: string | null;
  date: number;
  entry?: {
    amount: number;
    asset_id: number;
  };
  purchase_change?: {
    amount: number;
    asset_id: number;
  };
  cash_outgoings_change?: {
    amount: number;
    asset_id: number;
  };
}

export default function useTransactionViewModelConverter(
  viewModels: TransactionConverterProps[]
): Transaction[] {
  const assets = useAssetStore((state) => state.assets);

  console.log(assets);
  return viewModels.map((viewModel) => {
    let delta: string = "";
    let description = viewModel.description || "";

    if (viewModel.entry) {
      const asset = assets.find((a) => a.id === viewModel.entry?.asset_id);
      delta = `${viewModel.entry.amount} ${asset?.ticker}`;
    }

    if (viewModel.type === "asset_purchase") {
      const pruchase_asset = assets.find(
        (a) => a.id === viewModel.purchase_change?.asset_id
      );
      const sale_asset = assets.find(
        (a) => a.id === viewModel.cash_outgoings_change?.asset_id
      );
      description = `Purchased ${viewModel.purchase_change?.amount} units of ${pruchase_asset?.ticker}`;
      delta = `${viewModel.cash_outgoings_change?.amount} ${sale_asset?.ticker} -> ${viewModel.purchase_change?.amount} ${pruchase_asset?.ticker} `;
    }

    return {
      type: viewModel.type,
      description: description,
      date: viewModel.date,
      deltas: delta,
    };
  });
}
