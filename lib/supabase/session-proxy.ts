import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import {
  hasSupabaseConfig,
  supabaseConfig,
  demoEnabled,
  authCookieName,
} from "./config";

export async function refreshSession(request: NextRequest) {
  request.headers.set(
    "x-doctrack-return-to",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  if (!hasSupabaseConfig() || demoEnabled())
    return NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(url, key, {
    cookieOptions: {
      name: authCookieName,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, headers) => {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        for (const [name, value] of Object.entries(headers ?? {}))
          response.headers.set(name, value);
      },
    },
  });
  await client.auth.getUser();
  // Personalized data and auth cookies must never be cached by a CDN.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
