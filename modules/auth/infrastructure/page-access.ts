import "server-only";
import { redirect } from "next/navigation";
import { demoEnabled, hasSupabaseConfig } from "@/lib/supabase/config";
import { requirePageUser } from "./guards";
export async function enforcePageAccess(adminOnly = false, returnTo = "/") {
  if (demoEnabled()) return;
  if (!hasSupabaseConfig()) redirect("/login");
  await requirePageUser(adminOnly, returnTo);
}
