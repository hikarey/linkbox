import "server-only";
import { createClient } from "@supabase/supabase-js";

// RLS を通り抜ける管理者用の窓口。API ルートの中だけで使う
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}
