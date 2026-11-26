import test from "node:test";
import assert from "node:assert/strict";
import { friendlyError, fmtDuration, localDay, toLocalInput, text, num, whatsappUrl, telUrl } from "../src/app/index.ts";

test("fmtDuration", () => {
  assert.equal(fmtDuration(30), "30 min");
  assert.equal(fmtDuration(90), "1 h 30");
  assert.equal(fmtDuration(120), "2 h");
  assert.equal(fmtDuration(65), "1 h 05");
});

test("localDay and toLocalInput use LOCAL time, not UTC", () => {
  const d = new Date(2026, 10, 5, 0, 30); // 5 Nov 00:30 local: in UTC this can still be the 4th
  assert.equal(localDay(d), "2026-11-05");
  assert.equal(toLocalInput(d), "2026-11-05T00:30");
  assert.equal(toLocalInput(new Date(2026, 0, 2, 9, 5).toISOString()), "2026-01-02T09:05");
});

test("text/num: empty is null, comma decimals read, junk is null", () => {
  const fd = new FormData();
  fd.set("a", "  hi  "); fd.set("b", "   "); fd.set("c", "12,5"); fd.set("d", "x");
  assert.equal(text(fd, "a"), "hi");
  assert.equal(text(fd, "b"), null);
  assert.equal(text(fd, "missing"), null);
  assert.equal(num(fd, "c"), 12.5);
  assert.equal(num(fd, "d"), null);
});

test("whatsappUrl and telUrl", () => {
  assert.equal(whatsappUrl("333 123 4567"), "https://wa.me/393331234567");
  assert.equal(whatsappUrl("+39 333 123 4567"), "https://wa.me/393331234567");
  assert.equal(whatsappUrl("0039 333 123 4567", "ciao a tutti"), "https://wa.me/393331234567?text=ciao%20a%20tutti");
  assert.equal(telUrl("333 123 4567"), "tel:3331234567");
  assert.equal(telUrl(" +39 333-123-4567"), "tel:+393331234567");
});

import { findConflicts, groupByLocalDay } from "../src/app/schedule.ts";

const a = (id, start, min) => ({ id, starts_at: start, duration_min: min });
const list = [a("x", "2026-11-10T09:00:00Z", 90), a("y", "2026-11-10T12:00:00Z", 60)];

test("findConflicts: overlap yes, touching no, a gap only when asked, the moved one ignores itself", () => {
  assert.deepEqual(findConflicts(list, "2026-11-10T09:30:00Z", 30).map((c) => c.id), ["x"]);
  assert.deepEqual(findConflicts(list, "2026-11-10T08:00:00Z", 90).map((c) => c.id), ["x"]);
  assert.deepEqual(findConflicts(list, "2026-11-10T08:00:00Z", 60), [], "ends exactly when x starts");
  assert.deepEqual(findConflicts(list, "2026-11-10T10:30:00Z", 100).map((c) => c.id), ["y"], "starts exactly when x ends, runs into y");
  assert.deepEqual(findConflicts(list, "2026-11-10T10:30:00Z", 60), [], "fits between");
  assert.deepEqual(findConflicts(list, "2026-11-10T10:30:00Z", 60, { bufferMin: 15 }).map((c) => c.id), ["x"], "15 min pause wanted after x");
  assert.deepEqual(findConflicts(list, "2026-11-10T09:15:00Z", 60, { ignoreId: "x" }), []);
  assert.deepEqual(findConflicts(list, "not a date", 60), []);
  assert.deepEqual(findConflicts(list, "2026-11-10T09:00:00Z", 90).map((c) => c.id), ["x"], "same slot");
});

test("groupByLocalDay keeps order and splits at LOCAL midnight", () => {
  const items = [{ starts_at: new Date(2026, 10, 10, 23, 30).toISOString() }, { starts_at: new Date(2026, 10, 11, 0, 30).toISOString() }, { starts_at: new Date(2026, 10, 11, 9, 0).toISOString() }];
  const g = groupByLocalDay(items);
  assert.deepEqual([...g.keys()], ["2026-11-10", "2026-11-11"]);
  assert.equal(g.get("2026-11-11").length, 2);
});

test("friendlyError: Italian messages pass through, browser network errors are explained, junk gets a fallback", () => {
  assert.equal(friendlyError(new Error("Scrivi anche il nome del proprietario.")), "Scrivi anche il nome del proprietario.");
  for (const raw of ["Failed to fetch", "TypeError: Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource.", "The Internet connection appears to be offline."]) {
    assert.match(friendlyError(new TypeError(raw)), /connessione/, raw);
  }
  assert.equal(friendlyError("boom"), "Qualcosa è andato storto.");
  assert.equal(friendlyError(new Error("")), "Qualcosa è andato storto.");
  assert.equal(friendlyError(new Error("Il cane non è stato trovato nel failed-to-fetch archivio")), "Il cane non è stato trovato nel failed-to-fetch archivio", "only the real browser phrases match");
});
