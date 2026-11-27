#!/usr/bin/env node
/**
 * A one-time sign-in for the dashboard WITHOUT sending an email (so no mailer
 * rate limit): asks Supabase Auth (admin API) for a magic link + code and
 * prints them. For the owner of the Supabase project, run on their machine.
 *
 *   pnpm backend:login-link <email>            hosted project (linked with `supabase link`)
 *   pnpm backend:login-link <email> --local    the local stack (pnpm backend:local)
 *
 * The account must already exist in Auth and be in `staff`. The service key is
 * read through the Supabase CLI at run time and never written anywhere. The link
 * is a password-equivalent for one use: do not paste it into chats or tickets.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backend = join(dirname(fileURLToPath(import.meta.url)), "..");
const [email, ...flags] = process.argv.slice(2);
const local = flags.includes("--local");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: pnpm backend:login-link <email> [--local]");
  process.exit(1);
}

const cli = (args) =>
  execFileSync("supabase", args, { cwd: backend, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

let apiUrl, serviceKey, redirectTo;
if (local) {
  const env = Object.fromEntries(
    cli(["status", "-o", "env"]).split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
  );
  apiUrl = env.API_URL;
  serviceKey = env.SERVICE_ROLE_KEY;
  redirectTo = "http://localhost:4322/";
} else {
  const ref = readFileSync(join(backend, "supabase/.temp/project-ref"), "utf8").trim();
  const keys = JSON.parse(cli(["projects", "api-keys", "--project-ref", ref, "-o", "json"]));
  apiUrl = `https://${ref}.supabase.co`;
  serviceKey = keys.find((k) => k.name === "service_role")?.api_key;
  const toml = readFileSync(join(backend, "supabase/config.toml"), "utf8");
  redirectTo = toml.match(/^site_url\s*=\s*"([^"]+)"/m)?.[1];
}
if (!apiUrl || !serviceKey) {
  console.error("Could not read the project URL / service key (is the project linked, or the local stack running?).");
  process.exit(1);
}

const res = await fetch(`${apiUrl}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", email: email.toLowerCase(), redirect_to: redirectTo }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Supabase said ${res.status}: ${body.msg ?? body.message ?? JSON.stringify(body)}`);
  console.error("The account must exist in Auth (sign-up is off) and be listed in `staff`.");
  process.exit(1);
}
// Supabase returns the link HTML-escaped (`&amp;`): pasted as is, it fails.
const link = String(body.action_link ?? "").replaceAll("&amp;", "&");
console.log(`
One-time sign-in (valid ~1 hour, one use; no email was sent):
  Link: ${link}   (paste it into the browser you will use: the session stays there)
  Code: ${body.email_otp}   (or: login page → your email → "Ho già un codice")
Then set a password from "Password" at the bottom of the dashboard.`);
