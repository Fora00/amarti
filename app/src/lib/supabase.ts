import { createClient } from "@supabase/supabase-js";
import { problem, supabaseAnonKey, supabaseUrl } from "./env";

/** True only with a valid configuration. */
export const configured = problem === null;
export { problem, supabaseUrl };

// `createClient` throws on an empty URL, so an unconfigured build gets inert
// placeholders; nothing calls it unless `configured` is true.
// The session stays in this browser (localStorage) and is refreshed in the
// background, so the owner signs in by email once per browser/device and stays
// in until "Esci". These are supabase-js defaults, written out so nobody
// "optimises" them away.
export const supabase = createClient(supabaseUrl || "https://unset.invalid", supabaseAnonKey || "unset", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
