import {
  Avatar,
  Icon,
  ListItemAvatar,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { TransactionGroupViewModel } from "@/models";
import TransactionAmount from "./TransactionAmount";
import { useGetCategoriesQuery } from "@/services/myra";

function TransactionListItem(model: TransactionGroupViewModel) {
  const { description, category_id, transactions } = model;
  const { data, isLoading } = useGetCategoriesQuery();

  return (
    <>
      {isLoading ? (
        <Skeleton variant="circular" width={40} height={40} className=" mr-4" />
      ) : (
        <ListItemAvatar>
          <Avatar>
            <Icon>
              {
                // Set icon returned from the database or
                data?.find((x) => x.id === category_id)?.icon ?? "attach_money"
              }
            </Icon>
          </Avatar>
        </ListItemAvatar>
      )}
      <ListItemText primary={description} secondary="Jan 9, 2014" />
      <TransactionAmount transactions={transactions} />
    </>
  );
}
export default TransactionListItem;
