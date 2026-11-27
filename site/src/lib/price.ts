const LOCALE = "it-IT";

/** "€ 45,00" from `{ amount, currency }`. */
export function formatPrice(money: { amount: number; currency: string }, locale = LOCALE): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: money.currency }).format(money.amount);
}

/** "€ 12,50" from euro cents (the dashboard's price list); null = on request, handled by the caller. */
export const formatCents = (cents: number, locale = LOCALE): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
