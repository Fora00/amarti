/**
 * The only reader of environment variables in the app.
 *
 * Everything here is `PUBLIC_`, so it is visible to anyone who opens the site:
 * only the project URL and the anon key belong in it. Each variable is read by
 * name (never `const env = import.meta.env`), because referencing the whole
 * object makes Vite bundle every PUBLIC_ variable, used or not. The service-role key is
 * refused at build time by env-guard.mjs and is never read by app code.
 *
 * There is no demo / mock mode (plan/DECISIONS.md, 2026-11-27): the app always
 * talks to Supabase. A build without the two variables still succeeds and every
 * page shows `problem` instead of crashing.
 */
export const supabaseUrl: string = String(import.meta.env.PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
export const supabaseAnonKey: string = String(import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** Why the app cannot start, in Italian for the person looking at the screen; null if fine. */
export const problem: string | null = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Dashboard non ancora configurata: mancano PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY. Chi gestisce il sito deve impostarle e ripubblicare la dashboard.";
  }
  if (!/^https:\/\//.test(supabaseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(supabaseUrl)) {
    return "Dashboard non configurata correttamente: PUBLIC_SUPABASE_URL deve iniziare con https:// (o essere localhost).";
  }
  return null;
})();
