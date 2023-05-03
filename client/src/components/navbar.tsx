import React, { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";

interface IProps {
  isDarkMode: boolean;
  setIsDarkMode: Dispatch<SetStateAction<boolean>>;
}

const Navbar = (props: IProps) => {
  return (
    // <nav className="bg-white dark:bg-dark-900 w-full flex relative justify-between items-center mx-auto px-8 h-12">
    //   <h1 className="text-2xl dark:text-white font-bold">myra</h1>
    // </nav>
    <div className="flex-shrink-0 w-64 h-screen bg-light-900 dark:bg-dark-900">
      <div className="h-16 flex items-center justify-between px-4">
        <div className="text-lg font-semibold text-light-text dark:text-dark-text">
          Myra
        </div>
        <button
          className="p-2 rounded-full focus:outline-none text-light-text dark:text-dark-text"
          onClick={() => props.setIsDarkMode(!props.isDarkMode)}
        >
          dark mode
        </button>
      </div>
      <nav className="flex-grow py-4 px-2 space-y-2">
        <Link
          to={"/overview"}
          className="block px-4 py-2 font-medium text-light-text dark:text-dark-text hover:bg-light-600 dark:hover:bg-dark-600 rounded-md border-b-2 border-transparent hover:border-indigo-500"
        >
          Transaction List
        </Link>
        <Link
          to={"/portfolio"}
          className="block px-4 py-2 font-medium text-light-text dark:text-dark-text hover:bg-light-600 dark:hover:bg-dark-600 rounded-md border-b-2 border-transparent hover:border-indigo-500"
        >
          Portfolio
        </Link>
        <a className="block px-4 py-2 font-medium text-light-text dark:text-dark-text hover:bg-light-600 dark:hover:bg-dark-600 rounded-md border-b-2 border-transparent hover:border-indigo-500">
          Contact
        </a>
      </nav>
    </div>
  );
};

export default Navbar;
