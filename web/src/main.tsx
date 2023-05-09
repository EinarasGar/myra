import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/stores/store";
import router from "@/routes";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <CssBaseline />
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </StyledEngineProvider>
  </React.StrictMode>
);
