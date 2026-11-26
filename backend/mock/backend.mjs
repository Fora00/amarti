/**
 * Mock backend: a local stand-in for Supabase so the whole flow can be tried
 * before a project exists — a visitor sends the contact form, the owner sees it
 * in the app.
 *
 * It is a plug-in for the factory's demo server (`pnpm demo --amarti`, see
 * common/src/demo). The server owns static files, ports and persistence; this
 * file owns only what is specific to this site:
 *   1. POST /functions/v1/request — what the `request` edge function does,
 *      using the SAME validation (supabase/functions/_shared/*.ts)
 *   2. POST /__mock/rpc/<method> — what the app's data layer calls
 *
 * State: deploy/.state/amarti.json (git-ignored). `--reset` starts again.
 * When you add a table, add its methods here AND to app/src/lib/data-*.ts.
 */
import { randomUUID } from "node:crypto";

import { MAX_BODY_BYTES, validate } from "../supabase/functions/_shared/validate.ts";
import { requestFields } from "../supabase/functions/_shared/specs.ts";

const iso = (ms) => new Date(ms).toISOString();

// Assigned by createBackend(); one backend per process is enough for a dev mock.
let state;
let save;

const seed = () => ({ inbox: [] });

const methods = {
  listInbox() {
    return [...state.inbox]
      .sort((a, b) => Number(a.handled) - Number(b.handled) || b.created_at.localeCompare(a.created_at))
      .slice(0, 100);
  },
  countOpenInbox: () => state.inbox.filter((r) => !r.handled).length,
  markInboxHandled(id) {
    const row = state.inbox.find((r) => r.id === id);
    if (!row) throw new Error("richiesta non trovata");
    row.handled = true;
    save();
  },
};

export function createBackend(kit) {
  const store = kit.createStore(kit.stateFile, seed, { reset: kit.reset });
  state = store.state;
  save = store.save;

  async function acceptForm(req, res, okPath, failPath) {
    let params;
    try { params = new URLSearchParams(await kit.readBody(req, MAX_BODY_BYTES)); } catch { return kit.redirect(res, failPath); }
    const verdict = validate((name) => params.get(name), requestFields);
    if (verdict.result === "spam") return kit.redirect(res, okPath);
    if (verdict.result === "invalid") return kit.redirect(res, failPath);
    state.inbox.push({ id: randomUUID(), kind: "message", payload: verdict.values, handled: false, created_at: iso(Date.now()) });
    save();
    console.log(`  inbox ← ${verdict.values.nome}`);
    kit.redirect(res, okPath);
  }

  return {
    async handle(req, res, url) {
      const path = url.pathname;
      if (req.method === "POST" && path === "/functions/v1/request") {
        await acceptForm(req, res, "/grazie/", "/contatti/#errore");
        return true;
      }
      if (req.method === "POST" && path.startsWith("/__mock/rpc/")) {
        const name = path.slice("/__mock/rpc/".length);
        if (!Object.hasOwn(methods, name)) return kit.sendJson(res, 404, { error: `metodo sconosciuto: ${name}` }), true;
        let args = [];
        try { ({ args = [] } = JSON.parse((await kit.readBody(req, 200_000)) || "{}")); }
        catch { return kit.sendJson(res, 400, { error: "richiesta non valida" }), true; }
        try { kit.sendJson(res, 200, { result: methods[name](...args) ?? null }); }
        catch (e) { kit.sendJson(res, 400, { error: e.message }); }
        return true;
      }
      return false; // not ours: the demo server serves static files
    },
  };
}
