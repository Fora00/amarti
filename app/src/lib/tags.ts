/**
 * Preference tags for courses and people. Free text, but normalised (lower
 * case, trimmed, no "#") so "Ceramica" and "ceramica " are one tag. SUGGESTED
 * are offered as one-click chips; `guessTags()` proposes tags from a course
 * title so a new course is tagged in one click (she confirms, nothing is saved
 * automatically).
 */
export const SUGGESTED = [
  "ceramica", "modellazione", "decoro", "tornio", "candele", "gioielli", "macramè", "carta",
  "natale", "astrologia", "bambini", "aperitivo", "cosmetica naturale", "fiori e piante",
] as const;

export const normTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 40);

export function normTags(list: string[]): string[] {
  return [...new Set(list.map(normTag).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

const KEYWORDS: [RegExp, string][] = [
  [/ceramic|argilla|tazz|modell/i, "ceramica"],
  [/modell|argilla/i, "modellazione"],
  // "decoro" (ceramic decorating), not "decora la tua candela".
  [/\bdecoro\b/i, "decoro"],
  [/tornio/i, "tornio"],
  [/candel/i, "candele"],
  [/gioiell/i, "gioielli"],
  [/macram/i, "macramè"],
  [/carta|quadrett/i, "carta"],
  [/natal|alberell|festone/i, "natale"],
  [/astrolog|tarocch/i, "astrologia"],
  [/piccini|bambin/i, "bambini"],
  [/aperitiv|vin[oi]|brindisi|calice/i, "aperitivo"],
  [/bomba da bagno|saponi|erbe/i, "cosmetica naturale"],
  [/ghirland|fiori|piant/i, "fiori e piante"],
];

export function guessTags(title: string): string[] {
  return normTags(KEYWORDS.filter(([re]) => re.test(title)).map(([, tag]) => tag));
}
