import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Data } from "./data";
import type { CorsoRow, InboxRow, ListinoRow, RoomRequestRow, SignupRow, SlotRow, SlotState } from "./types";

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

  async listSignups() {
    return (ok(await supabase.from("signups").select("*").order("created_at", { ascending: false })) ?? []) as SignupRow[];
  },

  async countNewSignups() {
    const { count, error } = await supabase.from("signups").select("id", { count: "exact", head: true }).eq("status", "iscritta");
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async setSignupStatus(id, status) {
    ok(await supabase.from("signups").update({ status }).eq("id", id));
  },

  async listCorsi() {
    return (ok(await supabase.from("corsi").select("*")) ?? []) as CorsoRow[];
  },

  async setCorsoSumup(eventId, link) {
    ok(await supabase.from("corsi").upsert({ event_id: eventId, sumup_link: link, updated_at: new Date().toISOString() }));
  },

  async listListino() {
    return (ok(await supabase.from("listino").select("*").order("ordine").order("nome")) ?? []) as ListinoRow[];
  },

  async addListino(item) {
    ok(await supabase.from("listino").insert(item));
  },

  async updateListino(id, item) {
    ok(await supabase.from("listino").update({ ...item, updated_at: new Date().toISOString() }).eq("id", id));
  },

  async deleteListino(id) {
    ok(await supabase.from("listino").delete().eq("id", id));
  },

  async listSlots(fromDay) {
    return (ok(await supabase.from("disponibilita").select("*").gte("giorno", fromDay).order("giorno").order("inizio")) ?? []) as SlotRow[];
  },

  async addSlots(slots) {
    if (slots.length === 0) return 0;
    const rows = ok(await supabase.from("disponibilita")
      .upsert(slots, { onConflict: "giorno,inizio", ignoreDuplicates: true })
      .select("id")) ?? [];
    return rows.length;
  },

  async deleteSlot(id) {
    const rows = ok(await supabase.from("disponibilita").delete().eq("id", id).eq("stato", "libero").select("id")) ?? [];
    if (rows.length === 0) throw new Error("Questo orario non è più libero: c'è una richiesta. Annulla prima la richiesta.");
  },

  async listRoomRequests() {
    return (ok(await supabase.from("richieste_sala").select("*").order("created_at", { ascending: false })) ?? []) as RoomRequestRow[];
  },

  async countNewRoomRequests() {
    const { count, error } = await supabase.from("richieste_sala").select("id", { count: "exact", head: true }).eq("stato", "nuova");
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async setRoomRequestState(row, stato) {
    if (row.slot_id) {
      const target: SlotState = stato === "confermata" ? "confermato" : stato === "annullata" ? "libero" : "richiesto";
      let query = supabase.from("disponibilita").update({ stato: target }).eq("id", row.slot_id);
      // Taking a cancelled request back: only if nobody else has the slot meanwhile.
      if (row.stato === "annullata") query = query.eq("stato", "libero");
      const moved = ok(await query.select("id")) ?? [];
      if (row.stato === "annullata" && moved.length === 0) {
        throw new Error("L'orario di questa richiesta è già stato preso da un'altra persona.");
      }
    }
    ok(await supabase.from("richieste_sala").update({ stato }).eq("id", row.id));
  },
};
