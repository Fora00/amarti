/**
 * DOM and formatting helpers come from `@factory/common/app` (shared with every
 * private app). Only what depends on THIS app's deployment path stays here.
 */
export * from "@factory/common/app";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const href = (path: string) => `${base}${path}`;
