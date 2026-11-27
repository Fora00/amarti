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
  /** Ticked the optional "consigli" box: may receive course suggestions (unless revoked in `persone`). */
  consenso_consigli: boolean;
  status: SignupStatus;
  created_at: string;
}

/** One row of `corsi`: what the owner sets per course. `event_id` = the course id (day 1's entry id). */
export interface CorsoRow {
  event_id: string;
  /** Her SumUp payment link for this course; null = not set yet. */
  sumup_link: string | null;
  /** Preference tags, lower-case ("ceramica", "candele"…). */
  tags: string[];
  updated_at: string;
}

/** What she keeps about one person (`persone`, keyed by lower-case email). */
export interface PersonaRow {
  email: string;
  interessi: string[];
  note: string | null;
  consigli_revocati_at: string | null;
  updated_at: string;
}

/** A suggestion already sent (`consigli_inviati`). */
export interface ConsiglioRow {
  email: string;
  event_id: string;
  sent_at: string;
}

/** One row of `listino`: a shop item with a fixed price. Public once `visibile` (the site reads it at build time). */
export interface ListinoRow {
  id: string;
  nome: string;
  descrizione: string | null;
  /** Euro cents; null = "su richiesta". */
  prezzo_cents: number | null;
  ordine: number;
  visibile: boolean;
  updated_at: string;
}

export type ListinoInput = Pick<ListinoRow, "nome" | "descrizione" | "prezzo_cents" | "ordine" | "visibile">;

/** One room slot she opened (`disponibilita`). Times are "HH:MM:SS", Rovereto wall clock. */
export type SlotState = "libero" | "richiesto" | "confermato";
export interface SlotRow {
  id: string;
  giorno: string;
  inizio: string;
  fine: string;
  stato: SlotState;
  created_at: string;
}

export type RoomRequestState = "nuova" | "contattata" | "confermata" | "annullata";
/** One request from /servizi/prenota/ (`richieste_sala`). Text fields are untrusted: textContent only. */
export interface RoomRequestRow {
  id: string;
  slot_id: string | null;
  giorno: string;
  inizio: string;
  fine: string;
  tipo: "compleanno" | "attivita" | "altro";
  persone: number | null;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  note: string | null;
  privacy_at: string;
  stato: RoomRequestState;
  created_at: string;
}
