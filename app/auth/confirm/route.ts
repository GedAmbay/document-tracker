import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { appOrigin, hasSupabaseConfig } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const origin = hasSupabaseConfig() ? appOrigin() : request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (hasSupabaseConfig() && token && type === "invite") {
    const client = await createUserClient(true);
    const { error } = await client.auth.verifyOtp({
      token_hash: token,
      type: "invite",
    });
    if (!error)
      return NextResponse.redirect(new URL("/auth/set-password", origin));
  }
  return NextResponse.redirect(new URL("/login?notice=invite", origin));
}
