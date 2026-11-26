/**
 * The one door to the data. Pages call these methods and never know whether the
 * answer comes from the local mock backend or from Supabase — which is what lets
 * the app be built and tried before the real project exists, and connected
 * later by changing `PUBLIC_DATA_MODE` and nothing else.
 *
 * The two implementations must stay behaviourally identical: data-mock.ts talks
 * to backend/mock/backend.mjs, data-supabase.ts to the tables in
 * backend/supabase/schema.sql. When you add a method, add it to all three.
 */
import type { InboxRow } from "./types";
import { mode } from "./env";
import { mockData } from "./data-mock";
import { supabaseData } from "./data-supabase";

export interface Data {
  listInbox(): Promise<InboxRow[]>;
  countOpenInbox(): Promise<number>;
  markInboxHandled(id: string): Promise<void>;
}

export const data: Data = mode === "supabase" ? supabaseData : mockData;
