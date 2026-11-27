// The room-request rule as the server applies it (shape only; the slot claim
// needs the database and is exercised against the local stack).
import { test } from "node:test";
import assert from "node:assert/strict";

import { validate } from "../supabase/functions/_shared/validate.ts";
import { roomCheck, roomFailPath, roomFields, roomOkPath, roomRow } from "../supabase/functions/_shared/specs.ts";

const good = {
  slot_id: "0b7f5a8e-3c2d-4e1f-9a6b-5c4d3e2f1a0b",
  tipo: "compleanno",
  persone: "12",
  nome: "Giulia",
  cognome: "Rossi",
  email: "giulia@example.com",
  telefono: "+39 345 123 4567",
  note: "",
  privacy: "si",
  privacy_version: "bozza-2026-11-27b",
};
const run = (over = {}) => {
  const form = { ...good, ...over };
  return validate((name) => form[name], roomFields, roomCheck);
};

test("a complete request is accepted and maps to the row, slot data copied", () => {
  const v = run();
  assert.equal(v.result, "ok");
  const row = roomRow(v.values, { id: good.slot_id, giorno: "2026-12-05", inizio: "15:00:00", fine: "18:00:00" }, new Date("2026-11-27T10:00:00Z"));
  assert.equal(row.persone, 12);
  assert.equal(row.giorno, "2026-12-05");
  assert.equal(row.note, null);
  assert.equal("stato" in row, false);
});

test("people is optional, but a number from 1 to 500 when given", () => {
  assert.equal(roomRow(run({ persone: "" }).values, { id: "x", giorno: "", inizio: "", fine: "" }, new Date()).persone, null);
  for (const persone of ["0", "-3", "2.5", "tanti", "999"]) assert.equal(run({ persone }).result, "invalid", persone);
});

test("slot id must be a uuid and tipo one of the three", () => {
  for (const slot_id of ["1", "'; drop table x; --", "0b7f5a8e3c2d4e1f9a6b5c4d3e2f1a0b"]) assert.equal(run({ slot_id }).result, "invalid", slot_id);
  for (const tipo of ["festa", "COMPLEANNO", ""]) assert.equal(run({ tipo }).result, "invalid", tipo);
});

test("privacy, email and phone are checked like the sign-up", () => {
  assert.equal(run({ privacy: "on" }).result, "invalid");
  assert.equal(run({ email: "giulia@" }).result, "invalid");
  assert.equal(run({ telefono: "chiamami" }).result, "invalid");
});

test("answer pages follow the language", () => {
  assert.equal(roomOkPath("en"), "/en/servizi/richiesta-inviata/");
  assert.equal(roomOkPath(undefined), "/servizi/richiesta-inviata/");
  assert.equal(roomFailPath("en", "occupato"), "/en/servizi/prenota/#occupato");
  assert.equal(roomFailPath(null), "/servizi/prenota/#errore");
});
