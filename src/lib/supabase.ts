import { createClient } from "@supabase/supabase-js";

// ─── Supabase Connection ─────────────────────────────────────────────────────
// Uses the anon (public) key. RLS policies must be set correctly in Supabase.
// See supabase-rls-setup.sql for the required policies.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl =
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) ??
  "https://zjqsdmpwgqliexgnzwwm.supabase.co";

const supabaseKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) ?? "";

if (!supabaseKey) {
  console.error("[Supabase] VITE_SUPABASE_ANON_KEY not set in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type Category = { id: number; name: string; description: string };
export type Location = { id: number; name: string; taluk: string };
export type Inquiry = {
  id: number;
  category_id: number;
  location_id: number;
  description: string;
  rating: number | null;
  complainant_name: string | null;
  complainant_phone: string | null;
  feedback: string | null;
  reference_id: string | null;
  created_at: string;
  money_lost: number | null;
  categories?: Category | null;
  locations?: Location | null;
};
