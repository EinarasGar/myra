import axios from "axios";

export function getBaseUrl(): string {
  return axios.defaults.baseURL?.startsWith("http")
    ? axios.defaults.baseURL
    : window.location.origin;
}
