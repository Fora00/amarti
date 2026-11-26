import { createClient } from "@supabase/supabase-js";
import { mode, problem, supabaseAnonKey, supabaseUrl } from "./env";

/** True only in real mode with a valid configuration. */
export const configured = mode === "supabase" && problem === null;
export { mode, problem, supabaseUrl };

// `createClient` throws on an empty URL, so an unconfigured or mock build gets
// inert placeholders; nothing calls it unless `configured` is true.
export const supabase = createClient(supabaseUrl || "https://unset.invalid", supabaseAnonKey || "unset");
