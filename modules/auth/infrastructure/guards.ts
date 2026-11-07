import "server-only";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import {
  profileSchema,
  mayAccess,
  safeReturnPath,
} from "../domain/permissions";

export class AccessDenied extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
  }
}
export async function getAuthorizedUser(
  adminOnly = false,
  writeCookies = false,
) {
  const client = await createUserClient(writeCookies);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessDenied();
  const response = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  const parsed = profileSchema.safeParse(response.data);
  if (response.error || !parsed.success || !mayAccess(parsed.data, adminOnly))
    throw new AccessDenied();
  return { client, profile: parsed.data, user: data.user };
}
export async function requirePageUser(adminOnly = false, returnTo = "/") {
  try {
    return await getAuthorizedUser(adminOnly);
  } catch (error) {
    if (!(error instanceof AccessDenied)) throw error;
    redirect(
      `/login?notice=access&next=${encodeURIComponent(safeReturnPath(returnTo))}`,
    );
  }
}
