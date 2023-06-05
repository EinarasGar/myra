import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import { MouseEventHandler } from "react";
import { format } from "date-fns";
import TransactionAmount, { TransactionAmountData } from "./TransactionAmount";
import { CateogryAvatar } from "@/features/categories";

export interface TransactionGroupSummarySate {
  categoryId: number | undefined;
  amounts: TransactionAmountData[];
  description: string;
  date: Date | null;
  onClick?: MouseEventHandler<HTMLLIElement> | undefined;
}
function TransactionGroupSummary(props: TransactionGroupSummarySate) {
  const { categoryId, amounts, description, date, onClick } = props;
  return (
    <ListItem onClick={onClick}>
      <ListItemAvatar>
        <CateogryAvatar categoryId={categoryId} />
      </ListItemAvatar>
      <ListItemText
        primary={description}
        secondary={date && format(date, "MMMM dd, yyyy")}
      />
      <TransactionAmount amounts={amounts} />
    </ListItem>
  );
}

TransactionGroupSummary.defaultProps = {
  onClick: undefined,
};

export default TransactionGroupSummary;
