import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks";
import AddEditTransaction from "../components/AddEditTransaction";
import { GenerateNewId, MapRowStatesToAddModel } from "../utils";
import { selectUserId } from "@/features/auth";
import { usePostTransactionGroupMutation } from "@/app/myraApi";
import { GroupState } from "../models/GroupState";
import { RowState } from "../models/RowState";

function AddTransaction() {
  const navigate = useNavigate();
  const userId = useAppSelector(selectUserId);
  const [saveGroup, saveGroupState] = usePostTransactionGroupMutation();

  if (!userId) return <span>loading</span>;

  const onSave = (group: GroupState, rows: RowState[]) => {
    const mapped = MapRowStatesToAddModel(group, rows);
    if (mapped) {
      saveGroup({ group: mapped, user_id: userId })
        .unwrap()
        .then((newViewModel) => {
          navigate("/transactions");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  return (
    <AddEditTransaction
      initialGroup={null}
      initialRows={[
        {
          id: GenerateNewId(),
          description: null,
          category: null,
          asset: null,
          account: null,
          amount: null,
          date: null,
        },
      ]}
      onSave={onSave}
    />
  );
}

export default AddTransaction;
