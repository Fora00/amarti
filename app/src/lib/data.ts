/**
 * The one door to the data. Pages call these methods, never `supabase.from()`
 * directly, so the queries live in one file (data-supabase.ts) and match the
 * tables in backend/supabase/schema.sql.
 *
 * There is no mock implementation any more (plan/DECISIONS.md, 2026-11-27): the
 * app always talks to Supabase; an unconfigured build is stopped by
 * `requireStaff()` with a message before any of these is called.
 */
import type { CorsoRow, InboxRow, ListinoInput, ListinoRow, RoomRequestRow, RoomRequestState, SignupRow, SignupStatus, SlotRow } from "./types";
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
  /** Per-course settings (SumUp link), every course that has any. */
  listCorsi(): Promise<CorsoRow[]>;
  /** Set (or clear, with null) the SumUp link of one course. */
  setCorsoSumup(eventId: string, link: string | null): Promise<void>;
  /** The shop price list, in display order. */
  listListino(): Promise<ListinoRow[]>;
  addListino(item: ListinoInput): Promise<void>;
  updateListino(id: string, item: ListinoInput): Promise<void>;
  deleteListino(id: string): Promise<void>;
  /** Room slots from `fromDay` (YYYY-MM-DD) on, in date order. */
  listSlots(fromDay: string): Promise<SlotRow[]>;
  /** Open slots; an existing (day, start) is left as it is. Returns how many were new. */
  addSlots(slots: { giorno: string; inizio: string; fine: string }[]): Promise<number>;
  /** Only a FREE slot can be deleted (a requested one has a person waiting). */
  deleteSlot(id: string): Promise<void>;
  listRoomRequests(): Promise<RoomRequestRow[]>;
  countNewRoomRequests(): Promise<number>;
  /** Moves the request and its slot together: confermata → slot confermato, annullata → slot libero again. */
  setRoomRequestState(row: RoomRequestRow, stato: RoomRequestState): Promise<void>;
}

export const data: Data = supabaseData;
