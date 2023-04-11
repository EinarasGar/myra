import * as Separator from "@radix-ui/react-separator";

import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { insertNew } from "../features/asset/assetSlice";
import { TransactionGroupListRespData } from "../models/transaction_view_model";
import AddTranscation from "./transactions/add_transaction";
import TransactionRow from "./transactions/transaction_row";

const TransactionList = () => {
  const [data, setData] = useState<TransactionGroupListRespData | null>(null);
  const [errorr, setError] = useState(null);
  const navigate = useNavigate();
  const assets = useAppSelector((state) => state.asset.assets);
  const dispatch = useAppDispatch();

  useEffect(() => {
    axios
      .get("users/2396480f-0052-4cf0-81dc-8cedbde5ce13/transactions")
      .then((response) => {
        setData(response.data);
        const kazkas = response.data as TransactionGroupListRespData;
        if (kazkas !== null) {
          console.log("dispacinu");
          dispatch(insertNew(kazkas.assets_lookup_table));
        }
      })
      .catch((error) => setError(error));
  }, [dispatch]);

  if (errorr) {
    return <div>Error: {errorr}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  console.log("assets:");
  console.log(assets);

  return (
    <div className="relative max-w-screen-lg mx-auto pt-20 sm:pt-24 lg:pt-16">
      {/* <div className="dark:bg-dark-600 shadow-xl rounded-lg"> */}
      <div className="p-6">
        <div className="flex">
          <h5 className="text-2xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
            Transcations
          </h5>
          <div className="text-light-text dark:text-dark-text px-6">
            <button
              className="px-4 py-1 border border-gray-500 rounded-md font-bold hover:dark:bg-dark-600 hover:bg-light-600 cursor-pointer"
              onClick={() => navigate("/addtranscation")}
            >
              Add transaction
            </button>
          </div>
        </div>

        <Separator.Root className="bg-light-text dark:bg-dark-text h-px my-4" />
        <div className="flex flex-col">
          <div className="overflow-x-auto sm:-mx-6 lg:-mrx-8">
            <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
              <div className="overflow-hidden">
                <div className="min-w-full text-left text-sm font-light">
                  {data.groups.map((group) => (
                    <TransactionRow
                      key={group.group_id}
                      {...group}
                    ></TransactionRow>
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

export default TransactionList;
