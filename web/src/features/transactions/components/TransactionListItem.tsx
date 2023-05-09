import { Avatar, ListItemAvatar, ListItemText } from "@mui/material";
import { Image } from "@mui/icons-material";
import { TransactionGroupViewModel } from "@/models";
import TransactionAmount from "./TransactionAmount";

function TransactionListItem(model: TransactionGroupViewModel) {
  const { description, transactions } = model;
  return (
    <>
      <ListItemAvatar>
        <Avatar>
          <Image />
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={description} secondary="Jan 9, 2014" />
      <TransactionAmount transactions={transactions} />
    </>
  );
}
export default TransactionListItem;
