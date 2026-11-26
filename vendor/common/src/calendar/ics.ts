import { addDays, resolveTiming, type EventTiming } from "./time.ts";

/**
 * iCalendar (RFC 5545) output. One file per event gives "add to my calendar"
 * with no JavaScript; a feed of all events gives subscription.
 *
 * Timed events are written as UTC instants (`…Z`). That sidesteps `VTIMEZONE`
 * blocks entirely and every client renders them in the viewer's own zone.
 */

export interface IcsEvent {
  /** Stable per event — a changing UID duplicates the event in subscribers' calendars. */
  uid: string;
  title: string;
  timing: EventTiming;
  description?: string;
  location?: string;
  /** Absolute URL of the event page. */
  url?: string;
  status?: "scheduled" | "cancelled" | "postponed";
}

export interface IcsOptions {
  /** `PRODID` company/product, e.g. the site name. */
  productName: string;
  /** Calendar title shown by subscribers. */
  calendarName?: string;
  /** Host part of each UID: `<uid>@<host>`. */
  host: string;
  /** `DTSTAMP`. Pass a fixed value for reproducible output; defaults to now. */
  stamp?: Date;
}

const CRLF = "\r\n";

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold to 75 octets per line, continuing with a leading space — and never inside a UTF-8 character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const lines: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Continuation lines start with a space, which counts against the limit.
    const limit = lines.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      lines.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  lines.push(current);
  return lines.join(`${CRLF} `);
}

function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const compactDate = (date: string) => date.replaceAll("-", "");

function vevent(event: IcsEvent, options: IcsOptions, stamp: Date): string[] {
  const t = resolveTiming(event.timing);
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}@${options.host}`, `DTSTAMP:${utc(stamp)}`];

  if (t.allDay) {
    // DTEND is exclusive for DATE values, whereas authors write the last day.
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.timing.start)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(event.timing.end ?? event.timing.start, 1))}`);
  } else {
    lines.push(`DTSTART:${utc(t.start)}`);
    if (t.end) lines.push(`DTEND:${utc(t.end)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  // A postponed event has no date to honour; calendars have no such state, so it is the same as cancelled.
  if (event.status === "cancelled" || event.status === "postponed") lines.push("STATUS:CANCELLED");
  lines.push("END:VEVENT");
  return lines;
}

/** A complete `.ics` document for one or many events. */
export function icsCalendar(events: readonly IcsEvent[], options: IcsOptions): string {
  const stamp = options.stamp ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.productName}//Events//IT`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (options.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeText(options.calendarName)}`);
  }
  for (const event of events) lines.push(...vevent(event, options, stamp));
  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}

/** Filename-safe slug for a `Content-Disposition` or a route like `/eventi/<slug>.ics`. */
export function icsFilename(slug: string): string {
  return `${slug.replace(/[^a-z0-9-_]/gi, "-")}.ics`;
}
