/**
 * Sign-up rules the owner still has to decide, in ONE place (client-safe: no
 * astro:content here).
 */
import type { SignupRow, SignupStatus } from "./types";

/**
 * Minimum attendees for a course to run. Unknown yet (plan/BOOKING-FLOW.md,
 * "Ask her"): null shows "da definire". Set a number and rebuild.
 */
export const MINIMO_DEFAULT: number | null = null;

/**
 * A SumUp link as the dashboard accepts it: https, no spaces (the same rule as
 * the `corsi.sumup_link` check in backend/supabase/schema.sql). Returns the
 * cleaned link, or null when the text is not one.
 */
export function cleanSumupLink(text: string): string | null {
  const link = text.trim();
  if (!/^https:\/\/\S{4,300}$/.test(link)) return null;
  try {
    return new URL(link).protocol === "https:" ? link : null;
  } catch {
    return null;
  }
}

/** These hold a seat; `attesa` and `annullata` do not. */
export const ACTIVE: readonly SignupStatus[] = ["iscritta", "confermata", "pagato"];
export const isActive = (s: SignupRow) => ACTIVE.includes(s.status);

/** In the order the owner moves through them. */
export const STATUS_LABELS: Record<SignupStatus, string> = {
  iscritta: "Iscritta",
  confermata: "Confermata",
  pagato: "Pagato",
  attesa: "In attesa",
  annullata: "Annullata",
};
