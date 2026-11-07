import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { Suspense } from "react";
import { PacketListScreen } from "@/components/doctrack/packet-list";
export default async function Page() {
  await enforcePageAccess(false);
  return (
    <Suspense fallback={<p className="p-8">Loading packets…</p>}>
      <PacketListScreen />
    </Suspense>
  );
}
