import { hasSupabaseConfig } from "@/lib/supabase/browser";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    mode: hasSupabaseConfig() ? "supabase-ready" : "local-demo",
    timestamp: new Date().toISOString(),
  });
}
