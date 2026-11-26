export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/**
 * Join class names, dropping falsy values.
 *
 * Deliberately not `tailwind-merge`: these components expose variants rather
 * than accepting arbitrary overrides, so conflict resolution is not needed and
 * the dependency would be pure weight. If a caller's class loses to a
 * component's own, that is a signal the component needs a variant — not that
 * this helper needs to be smarter.
 */
export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cx(...input);
      if (nested) out.push(nested);
    } else {
      for (const [key, active] of Object.entries(input)) {
        if (active) out.push(key);
      }
    }
  }

  return out.join(" ");
}
