const storagePrefix = "myra_";

const storage = {
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

export default storage;
