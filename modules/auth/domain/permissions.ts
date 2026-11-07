import { z } from "zod";
export const roleSchema = z.enum(["admin", "staff"]);
export const profileSchema = z.object({
  id: z.uuid(),
  slot: z.number().int().min(1).max(7),
  email: z.email(),
  display_name: z.string().min(1),
  role: roleSchema,
  active: z.boolean(),
  created_at: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;
export function mayAccess(profile: Profile | null, adminOnly = false): boolean {
  return !!profile?.active && (!adminOnly || profile.role === "admin");
}
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/";
  // Auth endpoints may not be redirect destinations after sign-in.
  if (value.startsWith("/auth") || value.startsWith("/login")) return "/";
  return value;
}
