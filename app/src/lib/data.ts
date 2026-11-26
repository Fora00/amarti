/**
 * The one door to the data. Pages call these methods, never `supabase.from()`
 * directly, so the queries live in one file (data-supabase.ts) and match the
 * tables in backend/supabase/schema.sql.
 *
 * There is no mock implementation any more (plan/DECISIONS.md, 2026-11-27): the
 * app always talks to Supabase; an unconfigured build is stopped by
 * `requireStaff()` with a message before any of these is called.
 */
import type { InboxRow, SignupRow, SignupStatus } from "./types";
import { supabaseData } from "./data-supabase";

export interface Data {
  listInbox(): Promise<InboxRow[]>;
  countOpenInbox(): Promise<number>;
  markInboxHandled(id: string): Promise<void>;
  /** Every sign-up, newest first. */
  listSignups(): Promise<SignupRow[]>;
  /** Sign-ups still `iscritta` (not yet looked at): the Corsi tab badge. */
  countNewSignups(): Promise<number>;
  setSignupStatus(id: string, status: SignupStatus): Promise<void>;
}

export const data: Data = supabaseData;
