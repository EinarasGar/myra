/* eslint-env node */
module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "airbnb",
    "airbnb/hooks",
    "airbnb-typescript",
    "plugin:react-redux/recommended",
    "plugin:sonarjs/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "react-refresh", "react-redux", "sonarjs"],
  root: true,
  rules: {
    "react-refresh/only-export-components": "warn",
    "react/react-in-jsx-scope": "off",
    "no-param-reassign": "off",
    "react/jsx-key": "error",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "": "never",
        tsx: "never",
        ts: "never",
      },
    ],
  },
};
