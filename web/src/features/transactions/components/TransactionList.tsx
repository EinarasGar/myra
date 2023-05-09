import { List, ListItemButton } from "@mui/material";
import { useGetTransactionsQuery } from "@/services/myra";
import TransactionListItem from "./TransactionListItem";

function TransactionList() {
  const { data, error, isLoading } = useGetTransactionsQuery("asds");
  if (error) return <span>Error</span>;
  if (isLoading) return <span>Loading</span>;
  return (
    <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {data?.groups.map((model) => (
        <ListItemButton key={model.id}>
          <TransactionListItem
            transactions={model.transactions}
            description={model.description}
            date={model.date}
            category_id={model.category_id}
            id={model.id}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

export default TransactionList;
