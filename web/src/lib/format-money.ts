const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  KRW: "₩",
  ILS: "₪",
  THB: "฿",
  PHP: "₱",
  VND: "₫",
  TRY: "₺",
  NGN: "₦",
  RUB: "₽",
  UAH: "₴",
  BRL: "R$",
};

export function formatMoney(
  amount: number,
  ticker: string,
  signed = false,
): string {
  const sign = amount < 0 ? "-" : signed ? "+" : "";
  const number = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[ticker.toUpperCase()];
  if (symbol) return `${sign}${symbol}${number}`;
  if (ticker) return `${sign}${number} ${ticker}`;
  return `${sign}${number}`;
}
