import { createClient } from "@supabase/supabase-js";
import { problem, supabaseAnonKey, supabaseUrl } from "./env";

/** True only with a valid configuration. */
export const configured = problem === null;
export { problem, supabaseUrl };

// `createClient` throws on an empty URL, so an unconfigured build gets inert
// placeholders; nothing calls it unless `configured` is true.
export const supabase = createClient(supabaseUrl || "https://unset.invalid", supabaseAnonKey || "unset");
