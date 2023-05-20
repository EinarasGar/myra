import { RouteObject } from "react-router-dom";
import { useSelector } from "react-redux";
import Login from "../components/Login";
import Logout from "../components/Logout";
import { selectAuth } from "../authSlice";

const useAuthRotues = () => {
  const isLoggedIn = useSelector(selectAuth);
  let authRotues: RouteObject[] = [];
  if (isLoggedIn) {
    authRotues = [
      {
        path: "auth/logout",
        element: <Logout />,
      },
    ];
  } else {
    authRotues = [
      {
        path: "auth/login",
        element: <Login />,
      },
    ];
  }
  return authRotues;
};

export default useAuthRotues;
