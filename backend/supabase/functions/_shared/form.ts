// Shared by the public-form functions. A plain HTML <form method="post">
// cannot send headers or JSON, so these accept urlencoded/multipart bodies and
// answer with a 303 redirect back to the static site — which is what lets the
// public pages stay zero-JS. Validation itself lives in validate.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type FieldSpec, MAX_BODY_BYTES, validate } from "./validate.ts";

/** Where the static site lives, without a trailing slash. Set as a secret. */
const siteUrl = () => (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

function redirect(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: `${siteUrl()}${path}` } });
}

/** Validates a form POST and stores it in `inbox`. Always answers with a redirect. */
export async function handleForm(
  req: Request,
  kind: string,
  fields: FieldSpec,
  okPath: string,
  failPath: string,
  extraCheck?: (v: Record<string, string>) => boolean,
): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return redirect(failPath);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return redirect(failPath);
  }

  const verdict = validate((name) => form.get(name), fields, extraCheck);
  if (verdict.result === "spam") return redirect(okPath);
  if (verdict.result === "invalid") return redirect(failPath);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { error } = await db.from("inbox").insert({ kind, payload: verdict.values });
  if (error) {
    console.error("inbox insert failed", error.message);
    return redirect(failPath);
  }
  return redirect(okPath);
}
