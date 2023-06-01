import React from "react";
import ReactDOM from "react-dom/client";
import {
  CssBaseline,
  StyledEngineProvider,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { Provider } from "react-redux";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { store } from "@/app/store";
import AppRoutes from "@/routes";
import "./index.css";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Provider store={store}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <AppRoutes />
          </LocalizationProvider>
        </Provider>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);
