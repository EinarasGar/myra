import { List, ListItemButton, Skeleton } from "@mui/material";
import { useGetTransactionsQuery } from "@/app/myraApi";
import TransactionListItem from "./TransactionListItem";

function TransactionList() {
  const { data, error, isLoading } = useGetTransactionsQuery("asds");
  if (error) return <span>Error</span>;
  return (
    <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
      {isLoading
        ? Array(5)
            .fill(1)
            .map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <ListItemButton key={i}>
                <Skeleton
                  variant="circular"
                  width={40}
                  height={40}
                  className=" mr-4"
                />
                <Skeleton className=" w-full h-10" />
              </ListItemButton>
            ))
        : data?.groups.map((model) => (
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
