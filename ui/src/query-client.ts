import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient();

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "/";

// Debug: add 500ms delay to all API calls
// axios.interceptors.request.use(
//   (config) => new Promise((resolve) => setTimeout(() => resolve(config), 500)),
// );
