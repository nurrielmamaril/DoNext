import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Bypasses Row Level Security entirely via the service-role key. Only ever
// call this after an explicit owner check has already passed (see
// app/(app)/settings/page.tsx) — anything queried through this client
// ignores every RLS policy in the database, including "users can only read
// their own profile."
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
