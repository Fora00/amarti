/** One submission from the public form, as stored by the `request` function. */
export interface InboxRow {
  id: string;
  kind: string;
  /** Untrusted text typed by a stranger: render with textContent only. */
  payload: Record<string, string>;
  handled: boolean;
  created_at: string;
}
