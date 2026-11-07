import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { DashboardScreen } from "@/components/doctrack/dashboard";
export default async function Page() {
  await enforcePageAccess(false);
  return <DashboardScreen />;
}
