import "server-only";
import { z } from "zod";
export const authCookieName = "doctrack-auth";
export function demoEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DOCTRACK_DEMO_MODE === "true"
  );
}
function isPublishableKey(key: string) {
  if (key.startsWith("sb_publishable_") && key.length > 20) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1] ?? "", "base64url").toString(),
    );
    return payload.role === "anon";
  } catch {
    return false;
  }
}
const schema = z.object({
  url: z.url(),
  key: z
    .string()
    .refine(
      isPublishableKey,
      "Only a publishable or legacy anon key is permitted",
    ),
});
export function hasSupabaseConfig() {
  try {
    const origin = new URL(process.env.APP_URL ?? "");
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    )
      return false;
  } catch {
    return false;
  }
  return schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}
export function supabaseConfig() {
  return schema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
export function appOrigin() {
  return new URL(process.env.APP_URL || "http://localhost:3000").origin;
}
