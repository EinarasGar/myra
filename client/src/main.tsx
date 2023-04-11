import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";
import { store } from "./app/store";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Overview from "./components/overview";
import TransactionList from "./components/transaction_list";
import AddTranscation from "./components/add_transaction";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/overview",
        element: <TransactionList />,
      },
      {
        path: "/addtranscation",
        element: <AddTranscation />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* <App /> */}
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);
