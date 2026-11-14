import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.HEALTHCHECK_SECRET;
  const headerSecret = request.headers.get("x-health-secret");

  if (
    configuredSecret &&
    headerSecret &&
    headerSecret !== configuredSecret
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid healthcheck secret" },
      { status: 401 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const start = Date.now();
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  return NextResponse.json({
    ok: true,
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://vbdekvixsfrvfoxblpdw.supabase.co",
    schemaInitialized: !error,
    organizationsCount: data?.length ?? 0,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
}
