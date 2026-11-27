/**
 * Preference tags for courses and people. Free text, but normalised (lower
 * case, trimmed, no "#") so "Ceramica" and "ceramica " are one tag. SUGGESTED
 * are offered as one-click chips; `guessTags()` proposes tags from a course
 * title so a new course is tagged in one click (she confirms, nothing is saved
 * automatically).
 */
export const SUGGESTED = [
  "ceramica", "modellazione", "decorazione", "candele", "gioielli", "intrecci", "carta",
  "natale", "bambini", "astrologia", "aperitivo", "cosmetica naturale", "fiori e piante",
] as const;

export const normTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 40);

export function normTags(list: string[]): string[] {
  return [...new Set(list.map(normTag).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

// Same vocabulary as backend/supabase/seed/2026-11-27-course-tags.sql.
const KEYWORDS: [RegExp, string][] = [
  [/ceramic|argilla|tazz|modell/i, "ceramica"],
  [/modell|argilla|tornio/i, "modellazione"],
  // decorating ceramics or glass ("decoro"), not "decora la tua candela"
  [/\bdecoro\b|calice/i, "decorazione"],
  [/candel/i, "candele"],
  [/gioiell/i, "gioielli"],
  [/macram|paracord|intrecc/i, "intrecci"],
  [/carta|quadrett/i, "carta"],
  [/natal|alberell|festone/i, "natale"],
  [/astrolog|tarocch/i, "astrologia"],
  [/piccini|bambin/i, "bambini"],
  [/aperitiv|vin[oi]\b|brindisi|degustazion/i, "aperitivo"],
  [/bomba da bagno|sapon|erbe/i, "cosmetica naturale"],
  [/ghirland|fiori|piant/i, "fiori e piante"],
];

export function guessTags(title: string): string[] {
  return normTags(KEYWORDS.filter(([re]) => re.test(title)).map(([, tag]) => tag));
}
