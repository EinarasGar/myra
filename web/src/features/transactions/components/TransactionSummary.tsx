import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import { useAppSelector } from "@/hooks";
import { CateogryAvatar } from "@/features/categories";
import { selectAssets } from "@/features/asset";

export interface TransactionSummarySate {
  categoryId: number | null | undefined;
  assetId: number | null | undefined;
  amount: number | null | undefined;
  description: string;
  accountName: string | null | undefined;
  date: Date | null;
}

function TransactionSummary(props: TransactionSummarySate) {
  const { categoryId, assetId, amount, description, accountName, date } = props;
  const assets = useAppSelector(selectAssets);

  const asset = assets.find((x) => x.id === assetId);

  return (
    <ListItem>
      <ListItemAvatar>
        <CateogryAvatar categoryId={categoryId} />
      </ListItemAvatar>
      <ListItemText primary={description} secondary={accountName} />
      <span>
        {asset?.ticker} {amount}
      </span>
    </ListItem>
  );
}

export default TransactionSummary;
