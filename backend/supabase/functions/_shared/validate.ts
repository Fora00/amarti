// Pure validation for the public forms. No Deno, no Supabase, no I/O: it is
// imported both by the real edge functions and by the local mock server
// (<project>/backend/mock/backend.mjs), so the two cannot disagree about what a valid
// submission is. Keep it free of anything Node or Deno specific.

export interface FieldRule {
  required?: boolean;
  max?: number;
}
export type FieldSpec = Record<string, FieldRule>;

export const MAX_BODY_BYTES = 20_000;
const MAX_FIELD = 2_000;

export type Verdict =
  | { result: "ok"; values: Record<string, string> }
  | { result: "spam" }
  | { result: "invalid" };

/**
 * `get` reads one raw field. Unknown fields are never read, so they are never
 * stored. The honeypot (`website`) is checked first: a bot that fills it is
 * reported as `spam`, and the caller answers with the same "thank you" a person
 * gets so the bot learns nothing.
 */
export function validate(
  get: (name: string) => unknown,
  spec: FieldSpec,
  extraCheck?: (values: Record<string, string>) => boolean,
): Verdict {
  if (String(get("website") ?? "").trim() !== "") return { result: "spam" };

  const values: Record<string, string> = {};
  for (const [name, rule] of Object.entries(spec)) {
    const value = String(get(name) ?? "").trim().slice(0, rule.max ?? MAX_FIELD);
    if (rule.required && value === "") return { result: "invalid" };
    values[name] = value;
  }
  if (extraCheck && !extraCheck(values)) return { result: "invalid" };
  return { result: "ok", values };
}
