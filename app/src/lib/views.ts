/** Generic helpers live in `@factory/common/app` (shared by every private app); add this app's own views here. */
import { data } from "./data";
import { SUMUP_LINK, STATUS_LABELS } from "./corsi";
import type { SignupRow, SignupStatus } from "./types";
import { attempt, button, el, fmtFull, href, render, whatsappUrl } from "./ui";

export { attempt, field, whatsappUrl } from "./ui";

/** What the course card / page knows about the course, for the messages. */
export interface CourseInfo {
  title: string;
  dates: string;
}

/** Short Italian confirmation: the course runs, the SumUp link follows (or is here once set). */
export function confirmationText(row: SignupRow, course: CourseInfo): string {
  const pay = SUMUP_LINK
    ? `Per tenere il posto puoi pagare qui: ${SUMUP_LINK}`
    : "A breve ti mando il link SumUp per il pagamento, che tiene il posto.";
  return `Ciao ${row.nome}! Il corso "${course.title}" (${course.dates}) è confermato. ${pay} A presto, Martina – aMarti ceramics`;
}

const mailto = (email: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(email.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/**
 * One sign-up as a list item: name, contacts, date, status select and the two
 * message shortcuts. Every stranger-typed value goes through `el()` as a TEXT
 * node or an encoded URL, never as HTML. `course` is missing for a sign-up that
 * matches no course in the programme ("Altre iscrizioni").
 */
export function signupItem(row: SignupRow, course: CourseInfo | undefined, reload: () => Promise<void>) {
  const select = el("select", { class: "input", "aria-label": `Stato di ${row.nome} ${row.cognome}`, style: "width:auto" },
    ...(Object.keys(STATUS_LABELS) as SignupStatus[]).map((s) =>
      el("option", { value: s, selected: s === row.status }, STATUS_LABELS[s])));
  select.addEventListener("change", () => attempt(async () => {
    select.disabled = true;
    try {
      await data.setSignupStatus(row.id, select.value as SignupStatus);
      await reload();
    } finally {
      select.disabled = false;
    }
  }));

  const text = course ? confirmationText(row, course) : undefined;
  const subject = course ? `Conferma corso: ${course.title}` : "aMarti ceramics";
  const contacts = el("p", { class: "muted", style: "margin:.35rem 0 0" },
    row.email, row.telefono ? ` · ${row.telefono}` : "", " · iscritta il ", fmtFull(row.created_at));

  return el("li", { class: row.status === "iscritta" ? "card warn" : row.status === "annullata" ? "card quiet" : "card" },
    el("div", { class: "row" },
      el("strong", {}, `${row.nome} ${row.cognome}`),
      el("span", { class: "pill" }, STATUS_LABELS[row.status] ?? row.status)),
    contacts,
    course ? null : el("p", { class: "muted", style: "margin:.35rem 0 0" }, "Corso: ", row.event_id),
    row.note ? el("p", { style: "margin:.5rem 0 0;white-space:pre-wrap" }, row.note) : null,
    el("div", { class: "row", style: "justify-content:flex-start;flex-wrap:wrap;gap:.5rem;margin-top:.75rem" },
      select,
      row.telefono ? el("a", { href: whatsappUrl(row.telefono, text), class: "btn secondary small", target: "_blank", rel: "noopener noreferrer" }, "WhatsApp") : null,
      row.email ? el("a", { href: mailto(row.email, subject, text ?? `Ciao ${row.nome}!`), class: "btn secondary small" }, "Email") : null));
}

/** The "Password" link and the "Esci" button every signed-in page shows at the bottom. */
export function sessionButton(target: HTMLElement, signOut: () => Promise<unknown>) {
  render(target, el("span", { class: "row", style: "justify-content:flex-start;gap:.5rem" },
    el("a", { href: href("/account/"), class: "btn secondary" }, "Password"),
    button("Esci", () => attempt(async () => {
      await signOut();
      location.assign(href("/login/"));
    }), "secondary")));
}
