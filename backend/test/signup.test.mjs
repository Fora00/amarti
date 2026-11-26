// The sign-up rule as the server applies it: the real validate() + specs, with
// forged values the browser would never send. Run: pnpm --filter amarti-backend test
import { test } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../supabase/functions/_shared/validate.ts";
import {
  signupCheck,
  signupFailPath,
  signupFields,
  signupRow,
} from "../supabase/functions/_shared/specs.ts";

const good = {
  event_id: "2026-12-14-tazza-natale-day-1",
  nome: "  Giulia ",
  cognome: "Rossi",
  email: "giulia@example.com",
  telefono: "+39 345 123 4567",
  note: "",
  privacy: "si",
};
const run = (over = {}) => {
  const form = { ...good, ...over };
  return validate((name) => form[name], signupFields, signupCheck);
};

test("a complete sign-up is accepted, trimmed, and maps to the signups row", () => {
  const v = run();
  assert.equal(v.result, "ok");
  assert.equal(v.values.nome, "Giulia");
  const now = new Date("2026-11-27T10:00:00Z");
  assert.deepEqual(signupRow(v.values, now), {
    event_id: good.event_id,
    nome: "Giulia",
    cognome: "Rossi",
    email: good.email,
    telefono: good.telefono,
    note: null,
    privacy_at: "2026-11-27T10:00:00.000Z",
  });
});

test("a note is kept when given", () => {
  const v = run({ note: "Vengo con mia figlia" });
  assert.equal(signupRow(v.values, new Date()).note, "Vengo con mia figlia");
});

test("unknown fields are never read, so never stored", () => {
  const v = run({ status: "pagato", privacy_at: "2000-01-01" });
  assert.equal(v.result, "ok");
  assert.equal("status" in v.values, false);
  assert.equal("status" in signupRow(v.values, new Date()), false);
});

test("a filled honeypot is spam", () => {
  assert.equal(run({ website: "http://spam" }).result, "spam");
});

for (const field of ["event_id", "nome", "cognome", "email", "telefono", "privacy"]) {
  test(`missing or blank ${field} is refused`, () => {
    assert.equal(run({ [field]: undefined }).result, "invalid");
    assert.equal(run({ [field]: "   " }).result, "invalid");
  });
}

test("privacy must be exactly the checkbox value", () => {
  for (const privacy of ["on", "yes", "true", "1", "SI"]) assert.equal(run({ privacy }).result, "invalid", privacy);
});

test("email is checked by shape", () => {
  for (const email of ["giulia", "giulia@", "@example.com", "giulia@example", "a b@example.com", "giulia@example.com\nBcc: x@y.z"]) {
    assert.equal(run({ email }).result, "invalid", JSON.stringify(email));
  }
});

test("phone must be plausible", () => {
  for (const telefono of ["12345", "chiamami", "+39 345 abc", "1234567890123456"]) {
    assert.equal(run({ telefono }).result, "invalid", telefono);
  }
  for (const telefono of ["3451234567", "+39 (0464) 123-456", "0464.123456"]) {
    assert.equal(run({ telefono }).result, "ok", telefono);
  }
});

test("event_id must look like an event entry id", () => {
  for (const event_id of ["tazza", "2026-12-14", "2026-12-14-Tazza", "../2026-12-14-x", "2026-12-14-x/../y"]) {
    assert.equal(run({ event_id }).result, "invalid", event_id);
  }
});

test("fields are length-capped", () => {
  const v = run({ nome: "x".repeat(500), note: "y".repeat(5000) });
  assert.equal(v.result, "ok");
  assert.equal(v.values.nome.length, signupFields.nome.max);
  assert.equal(v.values.note.length, signupFields.note.max);
});

test("a refusal goes back to the event page only for a well-formed id", () => {
  assert.equal(signupFailPath(good.event_id), `/eventi/${good.event_id}/#errore`);
  assert.equal(signupFailPath("https://evil.example/"), "/eventi/");
  assert.equal(signupFailPath(undefined), "/eventi/");
});
