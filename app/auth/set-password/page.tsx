import { Suspense } from "react";
import { requirePageUser } from "@/modules/auth/infrastructure/guards";
import { AuthLogin } from "@/components/doctrack/auth-login";
import { hasSupabaseConfig, demoEnabled } from "@/lib/supabase/config";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
async function Setup() {
  // Do not freeze an unconfigured invitation redirect into static build output.
  await cookies();
  if (!hasSupabaseConfig() || demoEnabled()) redirect("/login");
  await requirePageUser();
  return <AuthLogin passwordSetup />;
}
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Verifying invitation…</p>}>
      <Setup />
    </Suspense>
  );
}
