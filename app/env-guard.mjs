/**
 * Build-time guard: refuse to build if a secret key sits in a PUBLIC_ variable.
 *
 * Astro inlines every `PUBLIC_*` value into the JavaScript that anyone can
 * download. The Supabase *anon* / *publishable* key is meant for that (row-level
 * security protects the data). The *service-role* / *secret* key bypasses RLS
 * and must never leave the server, so one in the browser bundle means every
 * dog record is readable and writable by the whole internet.
 *
 * Runtime checks cannot help — by then the key has already shipped. Hence this
 * runs in astro.config.mjs, before anything is bundled.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

/**
 * Reads the same files Vite would (`.env`, `.env.local`, `.env.production`),
 * with Node's own parser so this needs no dependency: `vite` is not resolvable
 * from a pnpm package that does not list it.
 */
export function readDotenvFiles(dir) {
  const vars = {};
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    const path = join(dir, file);
    if (existsSync(path)) Object.assign(vars, parseEnv(readFileSync(path, "utf8")));
  }
  return vars;
}

export function isSecretKey(value) {
  const v = String(value ?? "").trim();
  if (v.startsWith("sb_secret_")) return true; // new-style secret key
  const parts = v.split(".");
  if (parts.length !== 3) return false;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role === "service_role"; // legacy JWT key
  } catch {
    return false;
  }
}

/** Throws naming the variable (never the value) if any PUBLIC_ var is a secret. */
export function assertNoSecretsInPublicVars(vars) {
  for (const [name, value] of Object.entries(vars)) {
    if (name.startsWith("PUBLIC_") && isSecretKey(value)) {
      throw new Error(
        `${name} contains a service-role / secret key. PUBLIC_ variables are bundled into the ` +
          `browser JavaScript. Put the anon (publishable) key here instead, and keep the secret ` +
          `key server-side only (backend/supabase/.env, never in a PUBLIC_ variable).`,
      );
    }
  }
}
