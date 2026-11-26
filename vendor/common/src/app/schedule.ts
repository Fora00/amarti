/**
 * Pure helpers for a list of appointments. No DOM: usable from tests and pages.
 */
export interface Slotted {
  id: string;
  starts_at: string;
  duration_min: number;
}

/**
 * Which of `list` collide with a new/moved appointment? Touching is not a collision
 * ("ends at 10:30" and "starts at 10:30" are fine) unless `bufferMin` asks for a gap
 * (the pause between dogs). `ignoreId` is the appointment being moved: it must not
 * collide with its own old place.
 */
export function findConflicts<T extends Slotted>(list: T[], startsAtIso: string, durationMin: number, opts: { ignoreId?: string; bufferMin?: number } = {}): T[] {
  const start = Date.parse(startsAtIso);
  if (Number.isNaN(start)) return [];
  const end = start + durationMin * 60_000;
  const gap = (opts.bufferMin ?? 0) * 60_000;
  return list.filter((o) => {
    if (o.id === opts.ignoreId) return false;
    const s = Date.parse(o.starts_at);
    const e = s + o.duration_min * 60_000;
    return start < e + gap && end + gap > s;
  });
}

/** Group by local calendar day, keeping the order of `list`. Keys are YYYY-MM-DD. */
export function groupByLocalDay<T extends { starts_at: string }>(list: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of list) {
    const d = new Date(item.starts_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.set(key, [...(out.get(key) ?? []), item]);
  }
  return out;
}
