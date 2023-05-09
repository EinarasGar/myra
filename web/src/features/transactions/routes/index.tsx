import { Route, Routes } from "react-router-dom";
import { TransactionList } from "@/features/transactions";

function TransactionRoutes() {
  return (
    <Routes>
      <Route path="" element={<TransactionList />} />
    </Routes>
  );
}

export default TransactionRoutes;
