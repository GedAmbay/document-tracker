"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUserClient, clearUserCookies } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getAuthorizedUser } from "./guards";
import { safeReturnPath } from "../domain/permissions";
export type AuthResult = { error: string };
export async function signInAction(
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  const parsed = z
    .object({ email: z.email(), password: z.string().min(1).max(256) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success || !hasSupabaseConfig())
    return {
      error:
        "Unable to sign in. Check your credentials or contact your administrator.",
    };
  const client = await createUserClient(true);
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "Unable to sign in. Check your credentials or contact your administrator.",
    };
  try {
    await getAuthorizedUser(false, true);
  } catch {
    await client.auth.signOut().catch(() => {});
    await clearUserCookies();
    return {
      error:
        "Unable to sign in. Check your credentials or contact your administrator.",
    };
  }
  redirect(safeReturnPath(form.get("next")));
}
export async function signOutAction() {
  const client = await createUserClient(true);
  await client.auth.signOut().catch(() => {});
  await clearUserCookies();
  redirect("/login");
}
export async function setPasswordAction(
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  const parsed = z
    .object({ password: z.string().min(12).max(128), confirmation: z.string() })
    .refine((v) => v.password === v.confirmation)
    .safeParse({
      password: form.get("password"),
      confirmation: form.get("confirmation"),
    });
  if (!parsed.success)
    return { error: "Use matching passwords of 12–128 characters." };
  try {
    const { client } = await getAuthorizedUser(false, true);
    const { error } = await client.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) throw error;
  } catch {
    return {
      error:
        "Unable to set your password. Request a new invitation from your administrator.",
    };
  }
  redirect("/");
}
