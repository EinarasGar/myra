import React from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  TransactionGroupRespData,
  TransactionRespData,
} from "../../models/transaction_view_model";
import { useNavigate } from "react-router-dom";

const CalculateSum = (transactions: Array<TransactionRespData>) => {
  let sum = 0;
  transactions.forEach((t) => {
    sum += Number(t.quantity);
  });
  console.log(sum);
  return sum;
};

const TransactionRow = (group: TransactionGroupRespData) => {
  // const count = useAppSelector((state) => state.asset.value);
  // const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    // <div className="flex items-center p-4 dark:bg-dark-500 shadow rounded-md">
    //   <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-light-text dark:text-dark-text">
    //     <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
    //       <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-2-8v-2h4v2h-4zm0 3v-2h4v2h-4zm0 3v-2h4v2h-4z" />
    //     </svg>
    //   </div>
    //   <div className="ml-4 flex-grow">
    //     <div className="text-lg font-medium text-gray-900">
    //       Transaction Name
    //     </div>
    //     <div className="text-sm text-gray-500">{group.group_description}</div>
    //   </div>
    //   <div className="text-right">
    //     <div className="text-lg font-medium text-gray-900">-$50.00</div>
    //     <div className="text-sm text-gray-500">Transaction Category</div>
    //   </div>
    // </div>

    <div
      className="flex items-center py-4 px-6 rounded-lg hover:dark:bg-dark-600"
      onClick={() => navigate("/transaction/" + group.group_id)}
    >
      <div className="flex items-center justify-center flex-shrink-0 h-10 w-10 rounded-full bg-light-lavender text-white"></div>
      <div className="flex flex-col flex-grow ml-4">
        <div className="text-lg font-medium text-light-text dark:text-dark-text">
          {group.group_description}
        </div>
        <div className="text-sm text-light-subtext1 dark:text-dark-subtext1">
          Purchased on April 1, 2023
        </div>
      </div>
      <div className="text-lg font-medium text-light-text dark:text-dark-text">
        ${CalculateSum(group.transactions)}
      </div>
    </div>

    // <tr className="border-b dark:border-neutral-500 dark:text-dark-subtext1">
    //   <td className="whitespace-nowrap px-6 py-4">{group.group_id}</td>
    //   <td className="whitespace-nowrap px-6 py-4">{group.group_description}</td>
    //   <td className="whitespace-nowrap px-6 py-4">{group.group_category}</td>
    //   <td className="whitespace-nowrap px-6 py-4">{group.group_date}</td>
    // </tr>
  );
};

export default TransactionRow;
