import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { HistoryScreen } from "@/components/doctrack/history";
export default async function Page() {
  await enforcePageAccess(false);
  return <HistoryScreen />;
}
