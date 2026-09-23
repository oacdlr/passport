import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con service role: SALTA la RLS por completo.
 *
 * Único uso legítimo en este milestone: invitar usuarios (auth.admin.*), que
 * requiere privilegios de administración de Auth. Todo lo demás va por
 * createClient() de server.ts. Cualquier llamada desde aquí tiene que ir
 * precedida de un requireRole('admin').
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
