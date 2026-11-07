import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig, authCookieName } from "./config";
import type { Database } from "./database.types";
export async function createUserClient(writeCookies = false) {
  const jar = await cookies();
  const config = supabaseConfig();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      name: authCookieName,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // Proxy refreshes render-time sessions; actions/route handlers can persist cookies.
        if (writeCookies)
          for (const { name, value, options } of values)
            jar.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
      },
    },
  });
}
export async function clearUserCookies() {
  const jar = await cookies();
  for (const cookie of jar.getAll())
    if (
      cookie.name === authCookieName ||
      cookie.name.startsWith(authCookieName + ".")
    )
      jar.delete(cookie.name);
}
