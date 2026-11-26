/**
 * Calendar maths for event listings. Pure TypeScript, no Astro, no `Date`
 * arithmetic on the author's behalf.
 *
 * Authors write **wall-clock time in a named zone** (`2026-11-07T18:00` in
 * `Europe/Rome`), never a UTC instant and never a bare offset. A bare YAML
 * timestamp is read as UTC and an offset is wrong for half the year; both fail
 * silently as an event shifted by an hour. The zone is resolved here, with
 * `Intl`, so DST is handled by the platform's tz database.
 *
 * A value with no time part (`2026-11-07`) is an **all-day** event.
 */

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

/** `2026-11-07` or `2026-11-07T18:00`. */
export const LOCAL_DATETIME_PATTERN = LOCAL;

export interface EventTiming {
  /** Local wall-clock start. Date-only means all-day. */
  start: string;
  /** Local wall-clock end, same form as `start`. For all-day events it is inclusive. */
  end?: string;
  /** IANA zone, e.g. `Europe/Rome`. */
  timezone: string;
}

export interface ResolvedTiming {
  allDay: boolean;
  /** Real instants. For all-day events, midnight UTC of the calendar date. */
  start: Date;
  end?: Date;
  /** Local date `YYYY-MM-DD` — what a month grid groups on. */
  startDate: string;
  /** ISO-8601 with offset (`2026-11-07T18:00:00+01:00`), or the bare date if all-day. */
  startIso: string;
  endIso?: string;
}

interface Parts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  hasTime: boolean;
}

function parse(local: string): Parts {
  const m = LOCAL.exec(local);
  if (!m) throw new Error(`Invalid event date "${local}": expected YYYY-MM-DD or YYYY-MM-DDTHH:mm.`);
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4] ?? 0),
    mi: Number(m[5] ?? 0),
    hasTime: m[4] !== undefined,
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Offset of `timeZone` from UTC at an instant, in ms. Positive east of Greenwich. */
function offsetMs(instant: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const get: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instant))) {
    if (part.type !== "literal") get[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(get.year!, get.month! - 1, get.day!, get.hour!, get.minute!, get.second!);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

function formatOffset(ms: number): string {
  const sign = ms < 0 ? "-" : "+";
  const minutes = Math.abs(ms) / 60_000;
  return `${sign}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * The instant at which a wall-clock reading occurs in `timeZone`.
 *
 * The offset is looked up twice: once at the naive guess, once at the result,
 * so a time on the far side of a DST switch lands correctly. Wall times inside
 * the spring-forward gap resolve to the instant just after it.
 */
export function zonedToInstant(local: string, timeZone: string): { instant: Date; offset: string } {
  const p = parse(local);
  const naive = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  let offset = offsetMs(naive, timeZone);
  let instant = naive - offset;
  const corrected = offsetMs(instant, timeZone);
  if (corrected !== offset) {
    offset = corrected;
    instant = naive - offset;
  }
  return { instant: new Date(instant), offset: formatOffset(offset) };
}

export function resolveTiming(timing: EventTiming): ResolvedTiming {
  const startParts = parse(timing.start);
  const allDay = !startParts.hasTime;

  if (allDay) {
    return {
      allDay,
      start: new Date(Date.UTC(startParts.y, startParts.mo - 1, startParts.d)),
      end: timing.end ? dateOnlyToDate(timing.end) : undefined,
      startDate: timing.start,
      startIso: timing.start,
      endIso: timing.end,
    };
  }

  const start = zonedToInstant(timing.start, timing.timezone);
  const end = timing.end ? zonedToInstant(timing.end, timing.timezone) : undefined;
  return {
    allDay,
    start: start.instant,
    end: end?.instant,
    startDate: timing.start.slice(0, 10),
    startIso: `${timing.start}:00${start.offset}`,
    endIso: timing.end && end ? `${timing.end}:00${end.offset}` : undefined,
  };
}

function dateOnlyToDate(date: string): Date {
  const p = parse(date);
  return new Date(Date.UTC(p.y, p.mo - 1, p.d));
}

/** `YYYY-MM-DD` shifted by whole days, with no time zone involved. */
export function addDays(date: string, days: number): string {
  const shifted = dateOnlyToDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/* -- months ---------------------------------------------------------------- */

/** `2026-11` — the key a `/eventi/2026-11/` route is built from. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Invalid month key "${key}": expected YYYY-MM.`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/**
 * Group items by the month of their local start date, each month sorted
 * chronologically. Months come back in order, so a build can iterate them as
 * route params directly.
 */
export function groupByMonth<T>(
  items: readonly T[],
  timingOf: (item: T) => EventTiming,
): Map<string, T[]> {
  const decorated = items.map((item) => {
    const timing = resolveTiming(timingOf(item));
    return { item, key: monthKey(timing.startDate), at: timing.start.getTime() };
  });
  decorated.sort((a, b) => a.at - b.at);

  const months = new Map<string, T[]>();
  for (const { item, key } of decorated) {
    const bucket = months.get(key);
    if (bucket) bucket.push(item);
    else months.set(key, [item]);
  }
  return months;
}

export interface GridDay {
  /** Local `YYYY-MM-DD`. */
  date: string;
  /** False for the leading/trailing days that pad the first and last week. */
  inMonth: boolean;
}

/**
 * A month as rows of seven days, for a server-rendered `<table>` calendar.
 * Weeks start on Monday by default; pass `0` for Sunday.
 */
export function monthGrid(key: string, weekStartsOn: 0 | 1 = 1): GridDay[][] {
  const { year, month } = parseMonthKey(key);
  const first = `${year}-${pad(month)}-01`;
  const weekday = dateOnlyToDate(first).getUTCDay(); // 0 = Sunday
  const lead = (weekday - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  const weeks: GridDay[][] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(first, i - lead);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push({ date, inMonth: monthKey(date) === key });
  }
  return weeks;
}

/** True when the event has not finished by `now` (all-day events last through their final date). */
export function isUpcoming(timing: EventTiming, now: Date = new Date()): boolean {
  const resolved = resolveTiming(timing);
  if (resolved.allDay) {
    const lastDay = resolved.end ?? resolved.start;
    return lastDay.getTime() + 86_400_000 > now.getTime();
  }
  return (resolved.end ?? resolved.start).getTime() >= now.getTime();
}
