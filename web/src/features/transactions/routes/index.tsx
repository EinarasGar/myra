import { Route, Routes } from "react-router-dom";
import AllTransactions from "./AllTransactions";
import AddTransaction from "./AddTransaction";

function TransactionRoutes() {
  return (
    <Routes>
      <Route path="" element={<AllTransactions />} />
      <Route path="add" element={<AddTransaction />} />
    </Routes>
  );
}

export default TransactionRoutes;
