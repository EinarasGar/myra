import React from "react";
import { Form, useLoaderData, useParams } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import * as Separator from "@radix-ui/react-separator";
import { TransactionRespData } from "../models/transaction_view_model";

const CalculateSum = (transactions: Array<TransactionRespData>) => {
  let sum = 0;
  transactions.forEach((t) => {
    sum += Number(t.quantity);
  });
  console.log(sum);
  return sum;
};

const DisplayTransaction = () => {
  const { transactionId } = useParams();

  const transactions = useAppSelector(
    (state) => state.transaction.transactionGroups
  );

  const group = transactions.find((t) => t.group_id === transactionId);

  if (group === undefined) {
    return <div>Transaction not found</div>;
  }

  return (
    <div className="relative max-w-screen-lg mx-auto pt-20 sm:pt-24 lg:pt-16">
      <div className="p-6">
        <div className="flex">
          <h5 className="text-2xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
            Transcation
          </h5>
          {/* <div className="text-light-text dark:text-dark-text px-6">
            <button
              className="px-4 py-1 border border-gray-500 rounded-md font-bold hover:dark:bg-dark-600 hover:bg-light-600 cursor-pointer"
              onClick={() => navigate("/addtranscation")}
            >
              Add transaction
            </button>
          </div> */}
        </div>

        <Separator.Root className="bg-light-text dark:bg-dark-text h-px my-4" />
        <div className="flex flex-col">
          <div className="overflow-x-auto sm:-mx-6 lg:-mrx-8">
            <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
              <div className="overflow-hidden">
                <div className="min-w-full text-left text-sm font-light">
                  <div className="flex items-center py-4 px-6 rounded-lg hover:dark:bg-dark-600">
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
                  <Separator.Root className="bg-light-text dark:bg-dark-text h-px my-4" />
                  {group.transactions.map((trans) => (
                    <div
                      className="flex items-center py-4 px-6 rounded-lg hover:dark:bg-dark-600"
                      key={trans.transaction_id}
                    >
                      <div className="flex items-center justify-center flex-shrink-0 h-10 w-10 rounded-full bg-light-lavender text-white"></div>
                      <div className="flex flex-col flex-grow ml-4">
                        <div className="text-lg font-medium text-light-text dark:text-dark-text">
                          {trans.description}
                        </div>
                        <div className="text-sm text-light-subtext1 dark:text-dark-subtext1">
                          Purchased on April 1, 2023
                        </div>
                      </div>
                      <div className="text-lg font-medium text-light-text dark:text-dark-text">
                        {Number(trans.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayTransaction;
