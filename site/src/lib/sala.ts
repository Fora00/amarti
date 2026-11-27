/**
 * Free room slots (table `disponibilita`, opened by the owner in the dashboard
 * → Sala), read at build time — see public-data.ts. The page can be up to a
 * day stale (nightly build); the `room-request` function is the truth: a slot
 * taken meanwhile sends the visitor back with #occupato.
 */
import { publicRows } from "./public-data.ts";

export interface Slot {
  id: string;
  /** YYYY-MM-DD, Rovereto wall clock. */
  giorno: string;
  /** HH:MM:SS */
  inizio: string;
  fine: string;
}

/** Today in Rovereto: the build may run at 03:15 UTC, so not `new Date()` in UTC. */
const todayRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Free slots from today on, grouped by day in date order. */
export async function loadSlotsByDay(): Promise<[string, Slot[]][]> {
  const rows = await publicRows("disponibilita", `select=id,giorno,inizio,fine&stato=eq.libero&giorno=gte.${todayRome()}&order=giorno.asc,inizio.asc`);
  const byDay = new Map<string, Slot[]>();
  for (const row of rows) {
    if (!isSlot(row)) continue;
    byDay.set(row.giorno, [...(byDay.get(row.giorno) ?? []), row]);
  }
  return [...byDay];
}

const hhmm = (t: string) => t.slice(0, 5);
export const slotLabel = (slot: Slot) => `${hhmm(slot.inizio)} – ${hhmm(slot.fine)}`;

function isSlot(row: unknown): row is Slot {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(String(r.giorno)) &&
    /^\d{2}:\d{2}/.test(String(r.inizio)) && /^\d{2}:\d{2}/.test(String(r.fine));
}
