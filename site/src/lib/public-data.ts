/**
 * The few tables the public may read (RLS `public_read` in
 * backend/supabase/schema.sql), fetched at BUILD time with the anon key, so the
 * pages stay plain HTML. Never fails the build: without the env vars or on a
 * network/HTTP error it warns and returns [] (the section is then hidden).
 */
const project = String(import.meta.env.PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const anonKey = String(import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

const cache = new Map<string, Promise<unknown[]>>();

/** `query` is the PostgREST query string, e.g. `select=a,b&order=a.asc`. Memoised per build. */
export function publicRows(table: string, query: string): Promise<unknown[]> {
  const key = `${table}?${query}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = fetchRows(table, query);
    cache.set(key, hit);
  }
  return hit;
}

async function fetchRows(table: string, query: string): Promise<unknown[]> {
  if (!project || !anonKey) {
    console.warn(`[${table}] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY not set: left out of this build.`);
    return [];
  }
  try {
    const res = await fetch(`${project}/rest/v1/${table}?${query}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn(`[${table}] could not be read, left out of this build: ${String(error)}`);
    return [];
  }
}
