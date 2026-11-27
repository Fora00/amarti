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
  /** The version string of the privacy text the form linked to (/privacy/). Optional: an old cached page has none. */
  privacy_version: { max: 40 },
};

/** A privacy version as the site writes it, e.g. `2026-11-27` or `bozza-2026-11-27`. */
export const PRIVACY_VERSION = /^[a-z0-9-]{1,40}$/;

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
    v.privacy === PRIVACY_YES && (v.privacy_version === "" || PRIVACY_VERSION.test(v.privacy_version));
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
    privacy_version: v.privacy_version === "" ? null : v.privacy_version,
  };
}

/**
 * The page's language, sent by the form as a hidden `lang` (not stored): an
 * English page gets its answer under /en/. Anything but "en" means Italian.
 */
const prefix = (lang: unknown): string => (String(lang ?? "") === "en" ? "/en" : "");

/** Where an accepted sign-up goes: the thank-you page in the visitor's language. */
export const signupOkPath = (lang?: unknown): string => `${prefix(lang)}/iscrizione/`;

/** Where a refused sign-up goes back to: the event's own page, or the programme. */
export const signupFailPath = (eventId: unknown, lang?: unknown): string => {
  const id = String(eventId ?? "").trim();
  return EVENT_ID.test(id) ? `${prefix(lang)}/eventi/${id}/#errore` : `${prefix(lang)}/eventi/`;
};

// -- room request (servizi/prenota/ on the public site → `richieste_sala`) -----

export const ROOM_TIPI = ["compleanno", "attivita", "altro"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const roomFields: FieldSpec = {
  slot_id: { required: true, max: 36 },
  tipo: { required: true, max: 12 },
  persone: { max: 3 },
  nome: { required: true, max: 80 },
  cognome: { required: true, max: 80 },
  email: { required: true, max: 160 },
  telefono: { required: true, max: 30 },
  note: { max: 1000 },
  privacy: { required: true, max: 4 },
  privacy_version: { max: 40 },
};

/** Shape checks; whether the slot is still free is the function's job (it needs the DB). */
export function roomCheck(v: Record<string, string>): boolean {
  const persone = v.persone === "" ? 1 : Number(v.persone);
  return UUID.test(v.slot_id) && (ROOM_TIPI as readonly string[]).includes(v.tipo) &&
    Number.isInteger(persone) && persone >= 1 && persone <= 500 &&
    looksLikeEmail(v.email) && looksLikePhone(v.telefono) && v.privacy === PRIVACY_YES &&
    (v.privacy_version === "" || PRIVACY_VERSION.test(v.privacy_version));
}

/** Validated values + the claimed slot → the `richieste_sala` row. */
export function roomRow(
  v: Record<string, string>,
  slot: { id: string; giorno: string; inizio: string; fine: string },
  now: Date,
) {
  return {
    slot_id: slot.id,
    giorno: slot.giorno,
    inizio: slot.inizio,
    fine: slot.fine,
    tipo: v.tipo,
    persone: v.persone === "" ? null : Number(v.persone),
    nome: v.nome,
    cognome: v.cognome,
    email: v.email,
    telefono: v.telefono,
    note: v.note === "" ? null : v.note,
    privacy_at: now.toISOString(),
    privacy_version: v.privacy_version === "" ? null : v.privacy_version,
  };
}

/** Answer pages, in the visitor's language. `#occupato` = someone took the slot first. */
export const roomOkPath = (lang?: unknown): string => `${prefix(lang)}/servizi/richiesta-inviata/`;
export const roomFailPath = (lang?: unknown, reason: "errore" | "occupato" = "errore"): string =>
  `${prefix(lang)}/servizi/prenota/#${reason}`;
