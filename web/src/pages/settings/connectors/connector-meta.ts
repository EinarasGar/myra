export const CONNECTORS = [
  {
    kind: "truelayer",
    name: "TrueLayer",
    description:
      "Connect bank accounts via Open Banking. You authorise at your bank; Sverto imports and refreshes your transactions.",
  },
  {
    kind: "trading212",
    name: "Trading 212",
    description:
      "Import Trading 212 orders, dividends and cash movements using an API key.",
  },
] as const;
