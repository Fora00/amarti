/** One submission from the public form, as stored by the `request` function. */
export interface InboxRow {
  id: string;
  kind: string;
  /** Untrusted text typed by a stranger: render with textContent only. */
  payload: Record<string, string>;
  handled: boolean;
  created_at: string;
}

/**
 * Where a sign-up stands. Payment is outside the system (plan/BOOKING-FLOW.md):
 * iscritta → (course confirmed) confermata → (SumUp paid, ticked by hand) pagato;
 * attesa = waiting list; annullata = gone, kept for the record.
 */
export type SignupStatus = "iscritta" | "confermata" | "pagato" | "attesa" | "annullata";

/** One row of `signups` (backend/supabase/schema.sql), written by the `signup` function. */
export interface SignupRow {
  id: string;
  /** The site event's entry id (file name without .md) = the Corsi page's course id. */
  event_id: string;
  /** nome … note: untrusted text typed by a stranger — render with textContent only (`el()`). */
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  note: string | null;
  privacy_at: string;
  status: SignupStatus;
  created_at: string;
}
