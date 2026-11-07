import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { profileSchema, type Profile } from "@/modules/auth/domain/permissions";
import type { WorkspaceData } from "./types";

export async function loadWorkspace(
  client: SupabaseClient<Database>,
  profile: Profile,
): Promise<WorkspaceData> {
  const { data, error } = await client.rpc("read_tracking_workspace");
  if (error || !data || typeof data !== "object" || Array.isArray(data))
    throw new Error(
      "Workspace is unavailable. Retry or contact your administrator.",
    );
  const keys = [
    "profiles",
    "destinations",
    "templates",
    "packets",
    "documents",
    "events",
    "transfers",
    "states",
    "externalLinks",
  ];
  if (!keys.every((key) => Array.isArray(data[key])))
    throw new Error("Workspace schema is incompatible with this application.");
  const snapshot = data as unknown as Omit<WorkspaceData, "profile">;
  const current = profileSchema.parse(
    snapshot.profiles.find((p) => p.id === profile.id),
  );
  if (!current.active)
    throw new Error("Your workspace access has changed. Sign in again.");
  return { ...snapshot, profile: current };
}
