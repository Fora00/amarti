/**
 * Where the public forms POST: the Supabase edge function in
 * backend/supabase/functions. Built from `PUBLIC_SUPABASE_URL`; with no
 * project yet it stays a `.example` placeholder that can never resolve.
 */
const project = String(import.meta.env.PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
// `PUBLIC_FORMS_BASE` wins: the local demo sets it to `/functions/v1`, served by
// the mock backend on the same origin as the page.
const override = String(import.meta.env.PUBLIC_FORMS_BASE ?? "").trim().replace(/\/$/, "");
const functions =
  override || (project ? `${project}/functions/v1` : "https://forms.amarti.example/functions/v1");

export const forms = {
  request: `${functions}/request`,
  /** Course sign-up from an event page → `signups` (backend/supabase/functions/signup). */
  signup: `${functions}/signup`,
  /** Room booking request from /servizi/prenota/ → `richieste_sala` (backend/supabase/functions/room-request). */
  room: `${functions}/room-request`,
} as const;
