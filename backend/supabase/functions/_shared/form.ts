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

export interface FormTarget {
  fields: FieldSpec;
  okPath: string;
  /** A fixed path, or one read from the raw form (`undefined` when the body could not be read). */
  failPath: string | ((get: ((name: string) => unknown) | undefined) => string);
  extraCheck?: (v: Record<string, string>) => boolean;
  /** Validated values → the table and the row to insert (service role). */
  insert: (v: Record<string, string>) => { table: string; row: Record<string, unknown> };
}

/** Validates a form POST and stores one row. Always answers with a redirect. */
export async function handlePost(req: Request, target: FormTarget): Promise<Response> {
  const fail = (get?: (name: string) => unknown) =>
    redirect(typeof target.failPath === "string" ? target.failPath : target.failPath(get));

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) return fail();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail();
  }
  const get = (name: string) => form.get(name);

  const verdict = validate(get, target.fields, target.extraCheck);
  if (verdict.result === "spam") return redirect(target.okPath);
  if (verdict.result === "invalid") return fail(get);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { table, row } = target.insert(verdict.values);
  const { error } = await db.from(table).insert(row);
  if (error) {
    console.error(`${table} insert failed`, error.message);
    return fail(get);
  }
  return redirect(target.okPath);
}

/** Validates a form POST and stores it in `inbox`. Always answers with a redirect. */
export function handleForm(
  req: Request,
  kind: string,
  fields: FieldSpec,
  okPath: string,
  failPath: string,
  extraCheck?: (v: Record<string, string>) => boolean,
): Promise<Response> {
  return handlePost(req, {
    fields,
    okPath,
    failPath,
    extraCheck,
    insert: (payload) => ({ table: "inbox", row: { kind, payload } }),
  });
}
