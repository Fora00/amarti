// POST from /contatti/ on the public site → a row in the owner's inbox.
import { handleForm } from "../_shared/form.ts";
import { requestFields } from "../_shared/specs.ts";

Deno.serve((req) => handleForm(req, "message", requestFields, "/grazie/", "/contatti/#errore"));
