/**
 * The only reader of environment variables in the app.
 *
 * Everything here is `PUBLIC_`, so it is visible to anyone who opens the site:
 * only the project URL and the anon key belong in it. Each variable is read by
 * name (never `const env = import.meta.env`), because referencing the whole
 * object makes Vite bundle every PUBLIC_ variable, used or not. The service-role key is
 * refused at build time by env-guard.mjs and is never read by app code.
 */
export type DataMode = "mock" | "supabase";

/** `mock` (default) = in-browser sample data, no backend. `supabase` = real. */
export const mode: DataMode = import.meta.env.PUBLIC_DATA_MODE === "supabase" ? "supabase" : "mock";
export const supabaseUrl: string = String(import.meta.env.PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
export const supabaseAnonKey: string = String(import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** Why real mode cannot start, in Italian for the person looking at the screen; null if fine. */
export const problem: string | null = (() => {
  if (mode === "mock") return null;
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Modalità Supabase attiva ma mancano PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY nel file .env.";
  }
  if (!/^https:\/\//.test(supabaseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(supabaseUrl)) {
    return "PUBLIC_SUPABASE_URL deve iniziare con https:// (o essere localhost).";
  }
  return null;
})();
