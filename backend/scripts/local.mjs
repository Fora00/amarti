#!/usr/bin/env node
/**
 * A private Supabase on this machine, for trying the sign-up form and the app
 * without touching the real project. Needs Docker running and the Supabase CLI.
 *
 *   pnpm backend:local          start (or reuse) the stack, apply schema.sql,
 *                               make the staff user, write the .env.development files
 *   pnpm backend:local reset    empty `signups` and `inbox` (keeps the staff user)
 *   pnpm backend:local stop     stop the containers (data is kept for next time)
 *
 * Then `pnpm dev` (site, :4321) and `pnpm dev:app` (app, :4322) use this stack:
 * Astro reads `.env.development` only in dev, so `pnpm build` and GitHub Pages
 * keep using the real project from `.env` / repo variables.
 *
 * Magic-link emails are not sent: read them in the local mailbox (Mailpit),
 * printed at the end. Staff email: `LOCAL_STAFF_EMAIL` in the environment or in
 * backend/.env.local (git-ignored) — never committed, this repo is public.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backend = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(backend, "..");
const SITE_DEV = "http://localhost:4321";
const APP_DEV = "http://localhost:4322";

const quiet = (s) => !/new version of Supabase CLI|recommend updating/i.test(s);
function supabase(args, { capture = false } = {}) {
  const out = execFileSync("supabase", args, {
    cwd: backend,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  });
  return out.split("\n").filter(quiet).join("\n");
}

/** `supabase status -o env` → { API_URL, ANON_KEY, SERVICE_ROLE_KEY, ... } */
function status() {
  const env = {};
  for (const line of supabase(["status", "-o", "env"], { capture: true }).split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function staffEmail() {
  if (process.env.LOCAL_STAFF_EMAIL) return process.env.LOCAL_STAFF_EMAIL.trim().toLowerCase();
  const file = join(backend, ".env.local");
  const m = existsSync(file) && readFileSync(file, "utf8").match(/^LOCAL_STAFF_EMAIL=(.+)$/m);
  if (m) return m[1].trim().toLowerCase();
  throw new Error("Set LOCAL_STAFF_EMAIL (environment or backend/.env.local): the address that may log in to the local app.");
}

/** SQL through psql in the local db container (`supabase db query` refuses multi-statement files locally). */
function sql(text) {
  execFileSync("docker", ["exec", "-i", "supabase_db_amarti", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], {
    input: `set client_min_messages = warning;\n${text}`,
    stdio: ["pipe", "ignore", "inherit"],
  });
}

async function up() {
  // Function env for the local edge runtime (where to send the visitor after a
  // POST). Written BEFORE start: the runtime reads it when its container starts.
  writeFileSync(join(backend, "supabase/functions/.env"), `# Local only (pnpm backend:local). Git-ignored.\nSITE_URL=${SITE_DEV}\n`);

  console.log("Starting the local Supabase stack (first run downloads the images)…");
  supabase(["start"]);
  const s = status();
  if (!s.API_URL || !s.SERVICE_ROLE_KEY) throw new Error("`supabase status` gave no API_URL / SERVICE_ROLE_KEY.");
  const publicKey = s.PUBLISHABLE_KEY || s.ANON_KEY;

  console.log("Applying supabase/schema.sql…");
  sql(readFileSync(join(backend, "supabase/schema.sql"), "utf8"));

  const email = staffEmail();
  // The Auth user (sign-up is off, so it must exist before a magic link works)…
  const res = await fetch(`${s.API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: s.SERVICE_ROLE_KEY, Authorization: `Bearer ${s.SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`creating the staff user: HTTP ${res.status} ${await res.text()}`);
  // …and the row that RLS checks. The address is passed as a literal only after this check.
  if (!/^[^\s'@]+@[^\s'@]+\.[^\s'@]+$/.test(email)) throw new Error(`not an email: ${email}`);
  sql(`insert into staff (email) values ('${email}') on conflict do nothing`);

  const note = "# Written by `pnpm backend:local`: the LOCAL Supabase, used by `astro dev` only. Git-ignored.\n";
  // The site's build-time price list (src/lib/listino.ts) needs the key of the same stack.
  writeFileSync(join(root, "site/.env.development"), `${note}PUBLIC_SUPABASE_URL=${s.API_URL}\nPUBLIC_SUPABASE_ANON_KEY=${publicKey}\n`);
  writeFileSync(join(root, "app/.env.development"), `${note}PUBLIC_SUPABASE_URL=${s.API_URL}\nPUBLIC_SUPABASE_ANON_KEY=${publicKey}\n`);

  const mail = s.MAILPIT_URL || s.INBUCKET_URL || "http://127.0.0.1:54324";
  console.log(`
Local backend ready.
  Site:     pnpm dev       → ${SITE_DEV}/eventi/   (forms post to ${s.API_URL}/functions/v1/signup)
  App:      pnpm dev:app   → ${APP_DEV}/login/     (log in as ${email})
  Mailbox:  ${mail}        (the magic links land here, nothing is really sent)
  Studio:   ${s.STUDIO_URL || "http://127.0.0.1:54323"}        (browse the tables)
  Restart the dev servers if they were already running: they read .env.development at start.`);
}

function reset() {
  sql("truncate signups, inbox");
  console.log("Local signups and inbox emptied (staff user kept).");
}

function stop() {
  supabase(["stop"]);
  console.log("Local stack stopped; data is kept. `pnpm backend:local` starts it again.");
}

const cmd = process.argv[2] ?? "up";
const run = { up, reset, stop }[cmd];
if (!run) {
  console.error(`Unknown command "${cmd}". Use: up (default) | reset | stop`);
  process.exit(1);
}
try {
  await run();
} catch (err) {
  console.error(`\n${err.message ?? err}`);
  process.exit(1);
}
