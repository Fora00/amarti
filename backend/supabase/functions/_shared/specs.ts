// What the public contact form may contain. Shared by the edge function and the
// local mock backend (see validate.ts). A field not listed here is dropped, so a
// new input on the site does nothing until it is added here AND to the page.
import type { FieldSpec } from "./validate.ts";

export const requestFields: FieldSpec = {
  nome: { required: true, max: 120 },
  email: { required: true, max: 160 },
  telefono: { max: 40 },
  messaggio: { required: true, max: 2000 },
};

// -- course sign-up (eventi/<id>/ on the public site → `signups`) -------------

/** The site's event entry id: the Markdown file name without `.md`. */
export const EVENT_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

/** The value the privacy checkbox sends. Anything else (`on`, `yes`) is refused. */
export const PRIVACY_YES = "si";

export const signupFields: FieldSpec = {
  event_id: { required: true, max: 120 },
  nome: { required: true, max: 80 },
  cognome: { required: true, max: 80 },
  email: { required: true, max: 160 },
  telefono: { required: true, max: 30 },
  note: { max: 1000 },
  privacy: { required: true, max: 4 },
};

/** Shape only, and no whitespace (an address can end up in a mail header). */
export const looksLikeEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(s);

/** Digits with optional leading +, spaces, dots, dashes, slashes, brackets; 6–15 digits. */
export function looksLikePhone(s: string): boolean {
  if (!/^\+?[\d\s./()-]+$/.test(s)) return false;
  const digits = s.replace(/\D/g, "").length;
  return digits >= 6 && digits <= 15;
}

/** The checks a length cap cannot express. Pure: used by the function and the mock. */
export function signupCheck(v: Record<string, string>): boolean {
  return EVENT_ID.test(v.event_id) && looksLikeEmail(v.email) && looksLikePhone(v.telefono) &&
    v.privacy === PRIVACY_YES;
}

/**
 * Validated values → the `signups` row. `privacy_at` is the moment the server
 * accepted the ticked box; the checkbox value itself is not stored.
 */
export function signupRow(v: Record<string, string>, now: Date) {
  return {
    event_id: v.event_id,
    nome: v.nome,
    cognome: v.cognome,
    email: v.email,
    telefono: v.telefono,
    note: v.note === "" ? null : v.note,
    privacy_at: now.toISOString(),
  };
}

/** Where a refused sign-up goes back to: the event's own page, or the programme. */
export const signupFailPath = (eventId: unknown): string => {
  const id = String(eventId ?? "").trim();
  return EVENT_ID.test(id) ? `/eventi/${id}/#errore` : "/eventi/";
};
