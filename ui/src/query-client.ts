import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient();

axios.defaults.baseURL = "http://localhost:5173";
