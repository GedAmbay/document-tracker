// Real local GoTrue/PostgREST checks after provisioning test employees.
// Refuses hosted targets. No operator key is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const enabled = !!process.env.SUPABASE_LOCAL_TEST_URL;
function client() {
  const url = new URL(process.env.SUPABASE_LOCAL_TEST_URL);
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "Only disposable local Supabase is allowed",
  );
  return createClient(
    url.href,
    process.env.SUPABASE_LOCAL_TEST_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
test("local Auth refuses public registration", { skip: !enabled }, async () => {
  const api = client();
  const { error } = await api.auth.signUp({
    email: `unlisted-${randomUUID()}@example.com`,
    password: `Test-only-${randomUUID()}`,
  });
  assert.ok(error, "Public account registration must be disabled");
});
test(
  "local anonymous REST cannot read tracking tables",
  { skip: !enabled },
  async () => {
    const api = client();
    const { error } = await api.from("tracking_packets").select("*");
    assert.ok(error);
  },
);
test(
  "local staff login works but privilege escalation fails",
  { skip: !enabled },
  async () => {
    const api = client();
    assert.ok(
      process.env.SUPABASE_LOCAL_TEST_STAFF_EMAIL &&
        process.env.SUPABASE_LOCAL_TEST_STAFF_PASSWORD,
      "Provide local test staff credentials, never real employee credentials",
    );
    const login = await api.auth.signInWithPassword({
      email: process.env.SUPABASE_LOCAL_TEST_STAFF_EMAIL,
      password: process.env.SUPABASE_LOCAL_TEST_STAFF_PASSWORD,
    });
    assert.equal(login.error, null);
    try {
      const user = await api.auth.getUser();
      assert.ok(user.data.user);
      const profile = await api
        .from("profiles")
        .select("*")
        .eq("id", user.data.user.id)
        .single();
      assert.equal(profile.data?.role, "staff");
      const escalation = await api.rpc("set_profile_access", {
        p_profile_id: user.data.user.id,
        p_role: "admin",
        p_active: true,
      });
      assert.equal(escalation.error?.code, "42501");
      const direct = await api
        .from("tracking_events")
        .delete()
        .eq("recorded_by", user.data.user.id);
      assert.equal(direct.error?.code, "42501");
    } finally {
      await api.auth.signOut();
    }
  },
);
