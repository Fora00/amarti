/**
 * Browser helpers for the PRIVATE apps (the ones with a login, e.g. annina/app):
 * build DOM without innerHTML, format Italian dates, read forms, show one status
 * line, ask for confirmation. Promoted from annina/app/src/lib/{ui,views}.ts when
 * the app generator (scripts/templates/app) needed the same code: one copy, two users.
 *
 * Nothing here imports Vite or Astro, so it works in any bundler. Anything that
 * needs the deployment base path (`href`) stays in the app.
 *
 * The rule that matters: strings become TEXT nodes. The inbox holds what
 * strangers typed into public forms, so `el()` has no way to inject markup.
 */

type Child = Node | string | null | undefined | false;
type Props = Record<string, string | number | boolean | undefined>;

export * from "./schedule.ts";

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k === "class") node.className = String(v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

export function $<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`missing element ${selector}`);
  return node;
}

/** Replace a container's content. */
export function render(target: HTMLElement, ...children: Child[]) {
  target.replaceChildren(...(children.filter(Boolean) as (Node | string)[]));
}

const date = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const full = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (iso: string) => date.format(new Date(iso));
export const fmtLongDay = (iso: string) => longDate.format(new Date(iso));
export const fmtTime = (iso: string) => time.format(new Date(iso));
export const fmtFull = (iso: string) => full.format(new Date(iso));

/** 90 → "1 h 30", 30 → "30 min", 120 → "2 h". */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

/** The local calendar day of an instant as YYYY-MM-DD (not UTC: at 00:30 in Rome it is already tomorrow). */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${localDay(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Empty input → null, so optional columns stay null instead of "". */
export const text = (fd: FormData, name: string): string | null => {
  const v = String(fd.get(name) ?? "").trim();
  return v === "" ? null : v;
};
export const num = (fd: FormData, name: string): number | null => {
  const v = text(fd, name);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** One status line per page, announced to screen readers (role=status). */
export function say(message: string, isError = false) {
  const box = document.querySelector<HTMLElement>("#status");
  if (!box) return;
  box.textContent = message;
  box.dataset.error = isError ? "true" : "false";
}

export function button(label: string, onClick: () => void, variant = "") {
  const b = el("button", { type: "button", class: `btn ${variant}`.trim() }, label);
  b.addEventListener("click", onClick);
  return b;
}

/** The browsers' own words for "no network" (Chrome, Safari, Firefox) — never meant for a person to read. */
const NETWORK_ERROR = /failed to fetch|load failed|networkerror|network request failed|internet connection appears to be offline/i;

/** What to show for a failed action: our Italian messages as they are, a lost connection explained. */
export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : "";
  if (NETWORK_ERROR.test(message)) return "Non c'è connessione: riprova quando torna il segnale.";
  return message || "Qualcosa è andato storto.";
}

/** Run an async action; show the failure on the page instead of in the console only. */
export async function attempt(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (e) {
    say(friendlyError(e), true);
    console.error(e);
  }
}

/** A labelled input. Label is always visible and tied by `for`/`id`. */
export function field(
  name: string,
  label: string,
  value: string | number | null | undefined,
  opts: { multiline?: boolean; type?: string; required?: boolean; step?: string; span?: boolean; min?: string; autocomplete?: string; inputmode?: string } = {},
) {
  const id = `f-${name}`;
  const common = { id, name, class: "input", required: opts.required, autocomplete: opts.autocomplete };
  const control = opts.multiline
    ? el("textarea", { ...common, rows: 3 }, value == null ? "" : String(value))
    : el("input", { ...common, type: opts.type ?? "text", step: opts.step, min: opts.min, inputmode: opts.inputmode, value: value == null ? "" : String(value) });
  return el("div", { class: `field${opts.span ? " span-all" : ""}` }, el("label", { for: id }, label), control);
}

/** Digits for wa.me. Italian mobiles are 10 digits starting with 3. */
export function whatsappUrl(phone: string, text?: string): string {
  let d = phone.replace(/\D/g, "").replace(/^00/, "");
  if (d.length === 10 && d.startsWith("3")) d = `39${d}`;
  return text ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : `https://wa.me/${d}`;
}

/** `tel:` link: keeps a leading +, drops spaces and punctuation. */
export function telUrl(phone: string): string {
  const keep = phone.trim().startsWith("+") ? "+" : "";
  return `tel:${keep}${phone.replace(/\D/g, "")}`;
}

/**
 * A real confirmation, not window.confirm: it can be styled, it is a <dialog>
 * (focus is trapped, Esc cancels) and it works inside an installed app.
 * Resolves true only when she presses the confirm button.
 */
export function confirmDialog(message: string, opts: { confirmLabel?: string; cancelLabel?: string; detail?: string } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = el("dialog", { class: "sheet", "aria-labelledby": "confirm-title" });
    const yes = el("button", { type: "submit", value: "yes", class: "btn" }, opts.confirmLabel ?? "Conferma");
    const no = el("button", { type: "submit", value: "no", class: "btn secondary" }, opts.cancelLabel ?? "Indietro");
    const form = el("form", { method: "dialog" },
      el("p", { id: "confirm-title", class: "font-semibold" }, message),
      opts.detail ? el("p", { class: "muted" }, opts.detail) : null,
      el("div", { class: "row actions" }, no, yes));
    dialog.append(form);
    dialog.addEventListener("close", () => { resolve(dialog.returnValue === "yes"); dialog.remove(); });
    document.body.append(dialog);
    dialog.showModal();
    no.focus(); // the safe choice is the one under her thumb by default
  });
}
