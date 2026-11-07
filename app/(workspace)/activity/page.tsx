import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { ActivityScreen } from "@/components/doctrack/history";
export default async function Page() {
  await enforcePageAccess(false);
  return <ActivityScreen />;
}
