import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "@/App";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/test",
    element: <span>test</span>,
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <CssBaseline />
      <RouterProvider router={router} />
    </StyledEngineProvider>
  </React.StrictMode>
);
