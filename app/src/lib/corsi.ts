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
 * Her SumUp payment link, once she has one to share. Empty = the confirmation
 * message says the link will follow, without a URL. Never invent one.
 */
export const SUMUP_LINK = ""; // TODO: SumUp link from the owner

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
