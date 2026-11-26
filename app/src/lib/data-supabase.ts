import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Data } from "./data";
import type { InboxRow } from "./types";

/** Supabase returns `{ error }` instead of throwing; pages expect a rejection. */
function ok<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export const supabaseData: Data = {
  async listInbox() {
    return (ok(await supabase.from("inbox").select("*").order("handled").order("created_at", { ascending: false }).limit(100)) ??
      []) as InboxRow[];
  },

  async countOpenInbox() {
    const { count, error } = await supabase.from("inbox").select("id", { count: "exact", head: true }).eq("handled", false);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markInboxHandled(id) {
    ok(await supabase.from("inbox").update({ handled: true }).eq("id", id));
  },
};
