import { List } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useGetTransactionsQuery } from "@/app/myraApi";
import {
  TransactionGroupSummary,
  TransationSummarySkeleton,
} from "@/features/transactions";

function AllTransactions() {
  const { data, error, isLoading } = useGetTransactionsQuery("asds");
  const navigate = useNavigate();

  if (error) return <span>Error</span>;
  return (
    <List>
      {isLoading ? (
        <TransationSummarySkeleton repeat={5} />
      ) : (
        data?.groups.map((model) => (
          <TransactionGroupSummary
            key={model.id}
            categoryId={model.category_id}
            amounts={model.transactions.map((trans) => ({
              assetId: trans.asset_id,
              quantity: trans.quantity,
            }))}
            description={model.description}
            date={new Date(model.date)}
            onClick={() => {
              navigate(`/transactions/${model.id}`, { state: model });
            }}
          />
        ))
      )}
    </List>
  );
}

export default AllTransactions;
