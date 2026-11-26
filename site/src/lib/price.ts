const LOCALE = "it-IT";

/** "€ 45,00" from `{ amount, currency }`. */
export function formatPrice(money: { amount: number; currency: string }): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: money.currency }).format(money.amount);
}
