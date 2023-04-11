import * as Separator from "@radix-ui/react-separator";
import Select from "react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import React, { useEffect, useState } from "react";
import {
  AddTransactionGroupReqData,
  AddTransactionReqData,
} from "../models/transaction_view_model";
import axios from "axios";
import AddTransactionRow from "./transactions/add_transaction_row";

const AddTranscation = () => {
  const [groupDescription, setGroupDescription] = useState("");
  const [groupCategory, setGroupCategory] = useState(0);
  const [groupDate, setGroupDate] = useState("2022-01-01T00:00");

  const defaultTrans: AddTransactionReqData = {
    asset_id: 0,
    quantity: 0,
    category: 0,
    date: "",
    description: "description",
  };

  const defaultObj: AddTransactionGroupReqData = {
    transactions: [defaultTrans],
    description: "",
    date: "",
    category: 0,
  };

  const [transGroup, setTransGroup] = useState(defaultObj);

  function handleMultiTranscationButton() {
    const newTrans: AddTransactionReqData = {
      asset_id: 0,
      quantity: 0,
      category: 0,
      date: "",
      description: "description",
    };
    setTransGroup({
      ...transGroup,
      transactions: [...transGroup.transactions, newTrans],
    });
  }

  useEffect(() => {
    setTransGroup({
      ...transGroup,
      description: groupDescription,
      date: groupDate,
      category: groupCategory,
    });
  }, [groupCategory, groupDate, groupDescription]);

  function onTransactionChange(
    transaction: AddTransactionReqData,
    index: number
  ) {
    const newTrans = transGroup.transactions;
    newTrans[index] = transaction;
    setTransGroup({ ...transGroup, transactions: newTrans });
    console.log({ ...transGroup, transactions: newTrans });
  }

  function getISOStringFromLocalDateTime(localDateTime: string): string {
    try {
      console.log(localDateTime);
      const localDateTimeWithSecondsAndMilliseconds = `${localDateTime}:00.000`;
      const localTimezoneOffsetInMinutes = new Date().getTimezoneOffset();
      const utcDateTime = new Date(
        localDateTimeWithSecondsAndMilliseconds + "Z"
      );
      utcDateTime.setMinutes(
        utcDateTime.getMinutes() + localTimezoneOffsetInMinutes
      );
      console.log(1);
      return utcDateTime.toISOString();
    } catch (error) {
      return "2022-12-12T23:10:00.511Z";
    }
  }

  function handleSave() {
    console.log("save");

    // const reqObject: AddTransactionGroupReqData = {
    //   transactions: [reqTrans],
    //   description: description,
    //   date: date,
    //   category: category,
    // };
    console.log(transGroup);

    axios
      .post(
        "users/2396480f-0052-4cf0-81dc-8cedbde5ce13/transactions",
        transGroup
      )
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.error(error);
      });

    // console.log(reqObject);
  }
  return (
    <div className="relative max-w-screen-lg mx-auto pt-20 sm:pt-24 lg:pt-16">
      <div className="p-6">
        <h5 className="text-2xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
          Add New Transcation
        </h5>
        <Separator.Root className="bg-light-text dark:bg-dark-text h-px my-4" />
        {transGroup.transactions.length > 1 && (
          <>
            <h5 className="text-xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
              Group:
            </h5>
            <div className="flex flex-col lg:flex-row">
              <div className="w-full lg:w-1/6 lg:pr-4">
                <label className="block text-light-text dark:text-dark-text py-4">
                  <span>Group Category</span>
                  <select
                    id="category"
                    name="category"
                    className="w-full block form-input px-0 py-3 myra-form"
                    onChange={(e) => {
                      setGroupCategory(e.target.selectedIndex);
                    }}
                  >
                    <option value="">Select a category</option>
                    <option value="Income">Income</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Home Improvement">Home Improvement</option>
                    <option value="Entertainment">Entertainment</option>
                  </select>
                </label>
              </div>
              <div className="w-full lg:w-3/6 lg:px-4">
                <label className="block text-light-text dark:text-dark-text py-4">
                  <span>Group Description</span>
                  <input
                    className="w-full block form-input px-0 py-3 myra-form"
                    onChange={(e) => {
                      setGroupDescription(e.target.value);
                    }}
                  />
                </label>
              </div>
              <div className="w-full lg:w-2/6 lg:pl-4">
                <label className="block text-light-text dark:text-dark-text py-4">
                  <span>Group Date</span>
                  <input
                    type="datetime-local"
                    className="w-full block form-input px-0 py-3 myra-form"
                    onChange={(e) => {
                      setGroupDate(
                        getISOStringFromLocalDateTime(e.target.value)
                      );
                    }}
                  />
                </label>
              </div>
            </div>
            <Separator.Root className="bg-light-text dark:bg-dark-500 h-px my-4" />
            <h5 className="text-xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
              Sub Transactions:
            </h5>
          </>
        )}
        <div className="my-12 flex flex-col">
          {transGroup.transactions.map((item, i) => (
            <AddTransactionRow
              key={i}
              onTransactionChanged={onTransactionChange}
              index={i}
            ></AddTransactionRow>
          ))}

          <div className="flex flex-col lg:flex-row">
            <button
              className="w-full block form-input px-0 py-3 myra-form"
              onClick={handleMultiTranscationButton}
            >
              Add Sub Transcation
            </button>
          </div>
          <div className="flex flex-col lg:flex-row">
            <button
              className="w-full block form-input px-0 py-3 myra-form"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTranscation;
