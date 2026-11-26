import type { Data } from "./data";

/**
 * Talks to the mock backend (backend/mock/backend.mjs, started by
 * `pnpm demo --amarti`), which keeps the state in a JSON file and runs on the
 * same origin as the page, so there is no CORS and no login. The path is
 * origin-relative on purpose: the demo server owns it, whatever `base` is.
 */
async function rpc<T>(method: string, ...args: unknown[]): Promise<T> {
  const res = await fetch(`/__mock/rpc/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok) throw new Error(body.error ?? `server di prova: errore ${res.status}`);
  return body.result as T;
}

export const mockData: Data = {
  listInbox: () => rpc("listInbox"),
  countOpenInbox: () => rpc("countOpenInbox"),
  markInboxHandled: (id) => rpc("markInboxHandled", id),
};
