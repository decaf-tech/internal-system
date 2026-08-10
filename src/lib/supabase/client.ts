"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/env";

// Client Supabase untuk dipakai di Client Component (browser).
// Aman memakai anon key karena setiap tabel dilindungi RLS —
// lihat bagian "ROW LEVEL SECURITY" di supabase/schema.sql.
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseKey());
}
