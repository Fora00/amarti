import { configured, problem, supabase } from "./supabase";
import { href, say } from "./ui";

/**
 * Every page except login calls this first. It needs a session AND a row in
 * `staff`: the second check is for the day someone gets an account some other
 * way. RLS refuses them anyway; this just explains it instead of showing an
 * empty page.
 */
export async function requireStaff(): Promise<void> {
  if (!configured) {
    say(problem ?? "Dashboard non configurata.", true);
    throw new Error("supabase not configured");
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    // Keep the hash: a dead email link comes back as #error=…, and login explains it.
    location.replace(href("/login/") + location.hash);
    throw new Error("redirecting to login");
  }
  const { data: rows, error } = await supabase.from("staff").select("email").limit(1);
  if (error || !rows || rows.length === 0) {
    await supabase.auth.signOut();
    location.replace(href("/login/?negato=1"));
    throw new Error("not staff");
  }
}
