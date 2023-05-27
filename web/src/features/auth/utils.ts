import jwt from "jwt-decode";
import { JwtData } from "./types/jwtData";

const storagePrefix = "myra_";

export const storage = {
  getToken: () => {
    const value = window.localStorage.getItem(
      `${storagePrefix}token`
    ) as string;
    const token: string = JSON.parse(value) as string;
    return token;
  },
  setToken: (token: string) => {
    window.localStorage.setItem(`${storagePrefix}token`, JSON.stringify(token));
  },
  clearToken: () => {
    window.localStorage.removeItem(`${storagePrefix}token`);
  },
};

export const decodeJwtToken = (token: string) => jwt<JwtData>(token);
