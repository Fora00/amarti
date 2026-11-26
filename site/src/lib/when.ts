import { resolveTiming, type EventTiming } from "@factory/common/calendar";

const LOCALE = "it-IT";

/** "sabato 7 novembre, 18:00 – 20:00". All-day events show dates only. */
export function formatWhen(timing: EventTiming): string {
  const resolved = resolveTiming(timing);

  if (resolved.allDay) {
    const day = new Intl.DateTimeFormat(LOCALE, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const first = day.format(resolved.start);
    return resolved.end && timing.end !== timing.start
      ? `${first} – ${day.format(resolved.end)}`
      : first;
  }

  const zone = timing.timezone;
  // Date and time are formatted apart: a combined `dateStyle` + `timeStyle`
  // string inserts "alle ore" in Italian, which reads badly in a listing.
  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone: zone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(resolved.start);
  const clock = new Intl.DateTimeFormat(LOCALE, { timeZone: zone, hour: "2-digit", minute: "2-digit" });

  const from = clock.format(resolved.start);
  return resolved.end ? `${day}, ${from} – ${clock.format(resolved.end)}` : `${day}, ${from}`;
}

/** "novembre 2026" for a `2026-11` key. */
export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
}

/** Mon–Sun short names, matching `monthGrid()`'s default week start. */
export function weekdayLabels(): string[] {
  const format = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", weekday: "short" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

/**
 * The pieces of a poster date tile: "26", "gio", "nov", and the month number
 * that picks the tile colour. Read in the event's own zone.
 */
export function dateTile(timing: EventTiming): { day: string; weekday: string; month: string; monthNumber: number } {
  const { start, allDay } = resolveTiming(timing);
  const timeZone = allDay ? "UTC" : timing.timezone;
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(LOCALE, { timeZone, ...options }).format(start).replace(".", "");
  return {
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
    month: part({ month: "short" }),
    monthNumber: Number(part({ month: "numeric" })),
  };
}

/** "18:30 – 21:00", or "" for an all-day event. */
export function formatClock(timing: EventTiming): string {
  const resolved = resolveTiming(timing);
  if (resolved.allDay) return "";
  const clock = new Intl.DateTimeFormat(LOCALE, { timeZone: timing.timezone, hour: "2-digit", minute: "2-digit" });
  const from = clock.format(resolved.start);
  return resolved.end ? `${from} – ${clock.format(resolved.end)}` : from;
}
