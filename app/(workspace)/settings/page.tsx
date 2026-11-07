import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { SettingsScreen } from "@/components/doctrack/administration";
export default async function Page() {
  await enforcePageAccess(true);
  return <SettingsScreen />;
}
