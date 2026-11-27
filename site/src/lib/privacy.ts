/**
 * The version of the privacy text on /privacy/ (CONVENTIONS → "A consent text
 * is versioned data"). The sign-up form sends it, so each `signups` row records
 * which text the person accepted (`privacy_version`). Change it WITH the
 * wording, never without. Shape: lowercase letters, digits, dashes (≤ 40),
 * as the `signup` function checks.
 *
 * "bozza-…" while the owner has not confirmed the text; drop the prefix the
 * day she (or her accountant) approves it.
 */
export const PRIVACY_VERSION = "bozza-2026-11-27c";
