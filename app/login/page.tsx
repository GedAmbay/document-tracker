import { LoginScreen } from "@/components/doctrack/login";
import { AuthLogin } from "@/components/doctrack/auth-login";
import { demoEnabled, hasSupabaseConfig } from "@/lib/supabase/config";
import { safeReturnPath } from "@/modules/auth/domain/permissions";
import { Suspense } from "react";
import { MockProvider } from "@/components/doctrack/mock-provider";
async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return demoEnabled() ? (
    <MockProvider>
      <LoginScreen />
    </MockProvider>
  ) : (
    <AuthLogin
      next={safeReturnPath(query.next)}
      notice={typeof query.notice === "string" ? query.notice : undefined}
      configured={hasSupabaseConfig()}
    />
  );
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="p-8">Loading sign-in…</p>}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}
