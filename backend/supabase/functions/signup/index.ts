// POST from /eventi/<id>/ on the public site → a row in `signups` (status
// 'iscritta'). Free sign-up: payment is a SumUp link Martina sends by hand once
// the course is confirmed (plan/BOOKING-FLOW.md). Success → /iscrizione/,
// a refusal → back to the event page with #errore.
import { handlePost } from "../_shared/form.ts";
import { signupCheck, signupFailPath, signupFields, signupOkPath, signupRow } from "../_shared/specs.ts";

Deno.serve((req) =>
  handlePost(req, {
    fields: signupFields,
    okPath: (get) => signupOkPath(get("lang")),
    failPath: (get) => signupFailPath(get?.("event_id"), get?.("lang")),
    extraCheck: signupCheck,
    insert: (v) => ({ table: "signups", row: signupRow(v, new Date()) }),
  })
);
