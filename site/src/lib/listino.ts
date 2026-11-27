/**
 * The shop's price list (table `listino`, edited by the owner in the dashboard
 * → Listino prezzi), read at build time — see public-data.ts. A change shows
 * after the next build: every push, and the nightly run in pages.yml.
 */
import { publicRows } from "./public-data.ts";

export interface ListinoItem {
  nome: string;
  descrizione: string | null;
  /** Euro cents; null = "su richiesta". */
  prezzo_cents: number | null;
}

export async function loadListino(): Promise<ListinoItem[]> {
  const rows = await publicRows("listino", "select=nome,descrizione,prezzo_cents&visibile=eq.true&order=ordine.asc,nome.asc");
  return rows.filter(isItem);
}

/** Shape check: the response is trusted for content, not for structure. */
function isItem(row: unknown): row is ListinoItem {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.nome === "string" &&
    (r.descrizione === null || typeof r.descrizione === "string") &&
    (r.prezzo_cents === null || (typeof r.prezzo_cents === "number" && Number.isInteger(r.prezzo_cents)));
}
