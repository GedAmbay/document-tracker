import { redirect } from "next/navigation";
import {
  demoEnabled,
  hasSupabaseConfig,
  appOrigin,
} from "@/lib/supabase/config";
import { requirePageUser } from "@/modules/auth/infrastructure/guards";
import { loadWorkspace } from "@/modules/tracking/infrastructure/queries";
import { MockProvider } from "./mock-provider";
import { LiveProvider } from "./live-provider";
import { AppShell } from "./app-shell";
import { headers } from "next/headers";
import { safeReturnPath } from "@/modules/auth/domain/permissions";
export async function SecureWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  if (demoEnabled())
    return (
      <MockProvider>
        <AppShell>{children}</AppShell>
      </MockProvider>
    );
  const returnTo = safeReturnPath(
    (await headers()).get("x-doctrack-return-to"),
  );
  if (!hasSupabaseConfig())
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  const { client, profile } = await requirePageUser(false, returnTo);
  const data = await loadWorkspace(client, profile);
  return (
    <LiveProvider data={data} qrOrigin={appOrigin()}>
      <AppShell>{children}</AppShell>
    </LiveProvider>
  );
}
