// POST from /servizi/prenota/ on the public site → a row in `richieste_sala`,
// and the chosen slot goes from `libero` to `richiesto` so nobody else can take
// it. The claim is ONE conditional UPDATE (free AND not in the past), so two
// visitors racing for the same slot cannot both win; the loser goes back to the
// page with #occupato. Martina then contacts the person (dashboard → Sala).
import { createClient } from "npm:@supabase/supabase-js@2";
import { MAX_BODY_BYTES, validate } from "../_shared/validate.ts";
import { roomCheck, roomFailPath, roomFields, roomOkPath, roomRow } from "../_shared/specs.ts";

const siteUrl = () => (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const redirect = (path: string) => new Response(null, { status: 303, headers: { Location: `${siteUrl()}${path}` } });

/** Today in Rovereto, as YYYY-MM-DD: a slot of today is still bookable today. */
const todayRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return redirect(roomFailPath());

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return redirect(roomFailPath());
  }
  const get = (name: string) => form.get(name);
  const lang = get("lang");

  const verdict = validate(get, roomFields, roomCheck);
  if (verdict.result === "spam") return redirect(roomOkPath(lang));
  if (verdict.result === "invalid") return redirect(roomFailPath(lang));
  const v = verdict.values;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: claimed, error: claimError } = await db.from("disponibilita")
    .update({ stato: "richiesto" })
    .eq("id", v.slot_id).eq("stato", "libero").gte("giorno", todayRome())
    .select("id, giorno, inizio, fine");
  if (claimError) {
    console.error("slot claim failed", claimError.message);
    return redirect(roomFailPath(lang));
  }
  const slot = claimed?.[0];
  if (!slot) return redirect(roomFailPath(lang, "occupato"));

  const { error } = await db.from("richieste_sala").insert(roomRow(v, slot, new Date()));
  if (error) {
    console.error("richieste_sala insert failed", error.message);
    // Give the slot back: the request was not stored.
    await db.from("disponibilita").update({ stato: "libero" }).eq("id", slot.id).eq("stato", "richiesto");
    return redirect(roomFailPath(lang));
  }
  return redirect(roomOkPath(lang));
});
