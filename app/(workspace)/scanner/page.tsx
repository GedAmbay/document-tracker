import { enforcePageAccess } from "@/modules/auth/infrastructure/page-access";
import { ScannerScreen } from "@/components/doctrack/scanner";
export default async function Page() {
  await enforcePageAccess(false);
  return <ScannerScreen />;
}
