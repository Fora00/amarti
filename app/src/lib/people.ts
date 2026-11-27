/**
 * People = sign-ups grouped by lower-case email (one person signs up many
 * times). Pure functions, client-side: the dashboard already has every
 * sign-up; nothing new is stored except what she adds in `persone`.
 *
 * Consent to suggestions (GDPR art. 6.1.a, privacy text "consigli"): a person
 * may be suggested courses only if their LATEST sign-up with the box ticked is
 * newer than any revocation she recorded. No consent → no interests shown, no
 * suggestion buttons.
 */
import type { ConsiglioRow, PersonaRow, SignupRow } from "./types";
import { normTags } from "./tags";

export interface CourseLite {
  id: string;
  aliases: string[];
  title: string;
  dates: string;
  lastDay: string;
  tags: string[];
}

export interface Person {
  email: string;
  nome: string;
  cognome: string;
  telefono: string;
  signups: SignupRow[];
  /** Courses attended or signed up for (not cancelled), most recent first. */
  courseIds: string[];
  consent: boolean;
  /** tag → weight: manual interests count 2, each attended course's tag 1. */
  interests: Map<string, number>;
  manual: string[];
  note: string | null;
}

export function buildPeople(signups: SignupRow[], persone: PersonaRow[], courses: CourseLite[]): Person[] {
  const courseOf = new Map<string, CourseLite>();
  for (const c of courses) for (const a of c.aliases) courseOf.set(a, c);
  const extra = new Map(persone.map((p) => [p.email, p]));
  const groups = new Map<string, SignupRow[]>();
  for (const s of signups) {
    const key = s.email.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups].map(([email, rows]) => {
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = rows[0];
    const p = extra.get(email);
    const revoked = p?.consigli_revocati_at ?? "";
    const consent = rows.some((r) => r.consenso_consigli && r.created_at > revoked);
    const courseIds = [...new Set(rows.filter((r) => r.status !== "annullata")
      .map((r) => courseOf.get(r.event_id)?.id ?? r.event_id))];
    const manual = normTags(p?.interessi ?? []);
    const interests = new Map<string, number>();
    if (consent) {
      for (const t of manual) interests.set(t, (interests.get(t) ?? 0) + 2);
      for (const id of courseIds) for (const t of courseOf.get(id)?.tags ?? []) interests.set(t, (interests.get(t) ?? 0) + 1);
    }
    return {
      email, nome: latest.nome, cognome: latest.cognome, telefono: latest.telefono,
      signups: rows, courseIds, consent, interests, manual, note: p?.note ?? null,
    };
  }).sort((a, b) => `${a.nome} ${a.cognome}`.localeCompare(`${b.nome} ${b.cognome}`, "it"));
}

export interface Suggestion {
  course: CourseLite;
  score: number;
  /** The tags that matched, for "perché". */
  why: string[];
  sent: boolean;
}

/** Upcoming courses this person is not already in, best match first. Only with consent. */
export function suggestFor(person: Person, courses: CourseLite[], sent: ConsiglioRow[], today: string): Suggestion[] {
  if (!person.consent) return [];
  const sentIds = new Set(sent.filter((s) => s.email === person.email).map((s) => s.event_id));
  return courses
    .filter((c) => c.lastDay >= today && !person.courseIds.includes(c.id))
    .map((c) => {
      const why = c.tags.filter((t) => person.interests.has(t));
      return { course: c, why, score: why.reduce((n, t) => n + (person.interests.get(t) ?? 0), 0), sent: sentIds.has(c.id) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.course.lastDay.localeCompare(b.course.lastDay));
}

/** The WhatsApp/email text for one suggestion. `siteUrl` = the public site root, no trailing slash. */
export function suggestionText(person: Person, s: Suggestion, courses: CourseLite[], siteUrl: string): string {
  const liked = person.courseIds.map((id) => courses.find((c) => c.id === id)).find((c) => c && c.tags.some((t) => s.why.includes(t)));
  const because = liked ? `Visto che ti è piaciuto "${liked.title}", ` : "";
  return `Ciao ${person.nome}! ${because}ti segnalo "${s.course.title}" (${s.course.dates}). ` +
    `Se ti va, ti iscrivi qui: ${siteUrl}/eventi/${s.course.id}/ — Se non vuoi più consigli rispondi "basta consigli". Martina – aMarti ceramics`;
}
