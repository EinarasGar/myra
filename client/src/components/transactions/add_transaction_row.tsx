import React, { useEffect, useState } from "react";
import Select from "react-select";
import { AddTransactonViewModel } from "../../models/transaction_view_model/add_transaction_view_model";

const options = [
  { value: 1, label: "Chocolate" },
  { value: 2, label: "Strawberry" },
  { value: 3, label: "Vanilla" },
];

interface FuncProps {
  index: number;
  onTransactionChanged: (
    transaction: AddTransactonViewModel,
    index: number
  ) => void;
}

const AddTransactionRow = (props: FuncProps) => {
  const [category, setCategory] = useState(0);
  const [asset, setAsset] = useState(0);
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  function getISOStringFromLocalDateTime(localDateTime: string): string {
    try {
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

  function sendUpdate(transation: AddTransactonViewModel) {
    props.onTransactionChanged(transation, props.index);
  }

  useEffect(() => {
    const reqTrans: AddTransactonViewModel = {
      asset_id: asset,
      quantity: parseFloat(amount),
      category_id: category,
      date: date,
      description: description,
    };
    sendUpdate(reqTrans);
  }, [category, asset, account, amount, description, date]);

  return (
    <>
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/6 lg:pr-4">
          <label className="block text-light-text dark:text-dark-text py-4">
            <span>Category</span>
            <select
              id="category"
              name="category"
              className="w-full block form-input px-0 py-3 myra-form"
              onChange={(e) => {
                setCategory(e.target.selectedIndex);
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
            <span>Description</span>
            <input
              className="w-full block form-input px-0 py-3 myra-form"
              onChange={(e) => {
                setDescription(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="w-full lg:w-2/6 lg:pl-4">
          <label className="block text-light-text dark:text-dark-text py-4">
            <span>Date</span>
            <input
              type="datetime-local"
              className="w-full block form-input px-0 py-3 myra-form"
              onChange={(e) => {
                setDate(getISOStringFromLocalDateTime(e.target.value));
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 lg:pr-4">
          <label className="block text-light-text dark:text-dark-text py-4">
            <span>Asset</span>
            <select
              id="category"
              name="category"
              className="w-full block form-input px-0 py-3 myra-form"
              onChange={(e) => {
                setAsset(e.target.selectedIndex);
              }}
            >
              <option value="">Select a category</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
            </select>
          </label>
        </div>

        <div className="w-full lg:w-1/3 lg:pr-4">
          <label className="block text-light-text dark:text-dark-text py-4">
            <span>Account</span>
            <select
              id="category"
              name="category"
              className="w-full block form-input px-0 py-3 myra-form"
            >
              <option value="">Select an account</option>
              <option value="books">Books</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
            </select>
          </label>
        </div>
        <div className="w-full lg:w-1/3 lg:px-4">
          <label className="block text-light-text dark:text-dark-text py-4">
            <span>Amount</span>
            <input
              type="number"
              className="w-full block form-input px-0 py-3 myra-form"
              onChange={(e) => {
                setAmount(e.target.value);
              }}
            />
          </label>
        </div>
      </div>
    </>
  );
};

export default AddTransactionRow;
