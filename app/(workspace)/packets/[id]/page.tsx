import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { Suspense } from "react";
import { PacketDetailsScreen } from "@/components/doctrack/packet-details";
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await enforcePageAccess(false, `/packets/${id}`);
  return <PacketDetailsScreen id={id} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8">Loading packet…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
