import { useAssetStore } from "@/hooks/store/use-asset-store";

export interface Transaction {
  type: string;
  description: string;
  date: number;
  deltas: string;
}

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
  outgoing_entry?: {
    amount: number;
    asset_id: number;
  };
  incoming_entry?: {
    amount: number;
    asset_id: number;
  };
  outgoing_change?: {
    amount: number;
    asset_id: number;
  };
  incoming_change?: {
    amount: number;
    asset_id: number;
  };
  sale_entry?: {
    amount: number;
    asset_id: number;
  };
  proceeds_entry?: {
    amount: number;
    asset_id: number;
  };
}

export default function useTransactionViewModelConverter(
  viewModels: TransactionConverterProps[],
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
        (a) => a.id === viewModel.purchase_change?.asset_id,
      );
      const sale_asset = assets.find(
        (a) => a.id === viewModel.cash_outgoings_change?.asset_id,
      );
      description = `Purchased ${viewModel.purchase_change?.amount} units of ${pruchase_asset?.ticker}`;
      delta = `${viewModel.cash_outgoings_change?.amount} ${sale_asset?.ticker} -> ${viewModel.purchase_change?.amount} ${pruchase_asset?.ticker} `;
    }

    if (viewModel.type === "asset_transfer_out" && viewModel.entry) {
      const asset = assets.find((a) => a.id === viewModel.entry?.asset_id);
      delta = `${viewModel.entry.amount} ${asset?.ticker}`;
    }

    if (viewModel.type === "asset_transfer_in" && viewModel.entry) {
      const asset = assets.find((a) => a.id === viewModel.entry?.asset_id);
      delta = `${viewModel.entry.amount} ${asset?.ticker}`;
    }

    if (viewModel.type === "asset_trade") {
      const outgoingAsset = assets.find(
        (a) => a.id === viewModel.outgoing_entry?.asset_id,
      );
      const incomingAsset = assets.find(
        (a) => a.id === viewModel.incoming_entry?.asset_id,
      );
      description = `Traded ${viewModel.outgoing_entry?.amount} units of ${outgoingAsset?.ticker} for ${viewModel.incoming_entry?.amount} units of ${incomingAsset?.ticker}`;
      delta = `${viewModel.outgoing_entry?.amount} ${outgoingAsset?.ticker} -> ${viewModel.incoming_entry?.amount} ${incomingAsset?.ticker}`;
    }

    if (viewModel.type === "asset_balance_transfer") {
      const outgoingAsset = assets.find(
        (a) => a.id === viewModel.outgoing_change?.asset_id,
      );
      const incomingAsset = assets.find(
        (a) => a.id === viewModel.incoming_change?.asset_id,
      );
      description = `Transferred ${viewModel.outgoing_change?.amount} ${outgoingAsset?.ticker} to ${viewModel.incoming_change?.amount} ${incomingAsset?.ticker}`;
      delta = `${viewModel.outgoing_change?.amount} ${outgoingAsset?.ticker} -> ${viewModel.incoming_change?.amount} ${incomingAsset?.ticker}`;
    }

    if (viewModel.type === "account_fees" && viewModel.entry) {
      const asset = assets.find((a) => a.id === viewModel.entry?.asset_id);
      delta = `${viewModel.entry.amount} ${asset?.ticker}`;
    }

    if (viewModel.type === "asset_sale") {
      const saleAsset = assets.find(
        (a) => a.id === viewModel.sale_entry?.asset_id,
      );
      const proceedsAsset = assets.find(
        (a) => a.id === viewModel.proceeds_entry?.asset_id,
      );
      description = `Sold ${viewModel.sale_entry?.amount} units of ${saleAsset?.ticker}`;
      delta = `${viewModel.sale_entry?.amount} ${saleAsset?.ticker} -> ${viewModel.proceeds_entry?.amount} ${proceedsAsset?.ticker}`;
    }

    return {
      type: viewModel.type,
      description: description,
      date: viewModel.date,
      deltas: delta,
    };
  });
}
