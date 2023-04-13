import { useState } from "react";
import { Outlet } from "react-router-dom";
import "./App.css";
import Navbar from "./components/navbar";
import Overview from "./components/DisplayTransaction";
import Portfolio from "./components/portfolio";
import TransactionList from "./components/transaction_list";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`flex ${isDarkMode ? "dark" : ""}`}>
      <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}></Navbar>
      <div className="flex-grow bg-light-700 dark:bg-dark-700">
        {/* <TransactionList></TransactionList> */}
        {/* Main content goes here */}
        <Outlet></Outlet>
      </div>
    </div>
  );
}

export default App;
