import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { UsersScreen } from "@/components/doctrack/administration";
export default async function Page() {
  await enforcePageAccess(true);
  return <UsersScreen />;
}
