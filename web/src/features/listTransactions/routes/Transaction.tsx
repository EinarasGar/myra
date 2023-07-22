import { useLocation, useNavigate, useParams } from "react-router-dom";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Divider from "@mui/material/Divider";
import { Button } from "@mui/material";
import {
  TransactionGroupSummary,
  TransactionSummary,
} from "@/features/transactions";
import { TransactionGroupViewModel } from "@/models";

function Transaction() {
  const { transactionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as TransactionGroupViewModel | null;

  if (state === null) return <span>blogai</span>;
  return (
    <div className=" m-5">
      <Accordion expanded>
        <AccordionSummary>
          <TransactionGroupSummary
            categoryId={state.category_id}
            amounts={state.transactions.map((trans) => ({
              assetId: trans.asset_id,
              quantity: trans.quantity,
            }))}
            description={state.description}
            date={new Date(state.date)}
          />
        </AccordionSummary>
        <AccordionDetails />
      </Accordion>

      <Divider className="my-5" />

      {state.transactions.map((trans, i) => (
        <Accordion key={trans.id}>
          <AccordionSummary>
            <TransactionSummary
              categoryId={trans.category_id}
              assetId={trans.asset_id}
              amount={trans.quantity}
              description={
                trans.description ? trans.description : `Transaction ${i + 1}`
              }
              accountName={trans.account?.name}
              date={new Date(trans.date)}
            />
          </AccordionSummary>
          <AccordionDetails />
        </Accordion>
      ))}
      <Button
        onClick={() => {
          navigate(`/transactions/${state.id}/edit`, { state });
        }}
      >
        Edit
      </Button>
    </div>
  );
}

export default Transaction;
