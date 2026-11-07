import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { demoEnabled, hasSupabaseConfig } from "@/lib/supabase/config";
import {
  mayAccess,
  safeReturnPath,
  type Profile,
} from "@/modules/auth/domain/permissions";
import { eventInputSchema } from "@/modules/tracking/domain/schemas";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createUserClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
  })),
}));
import {
  getAuthorizedUser,
  AccessDenied,
} from "@/modules/auth/infrastructure/guards";
const profile: Profile = {
  id: "30000000-0000-4000-8000-000000000002",
  slot: 2,
  email: "staff@example.com",
  display_name: "BAC Staff",
  role: "staff",
  active: true,
  created_at: "2026-11-07T00:00:00Z",
};
afterEach(() => vi.unstubAllEnvs());
describe("production configuration", () => {
  it("cannot enable demo access in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOCTRACK_DEMO_MODE", "true");
    expect(demoEnabled()).toBe(false);
  });
  it("rejects privileged keys and requires HTTPS for a production app origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://doctrack.example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_secret_should_never_be_public",
    );
    expect(hasSupabaseConfig()).toBe(false);
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_example_public_key",
    );
    expect(hasSupabaseConfig()).toBe(true);
    vi.stubEnv("APP_URL", "http://doctrack.example.com");
    expect(hasSupabaseConfig()).toBe(false);
  });
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: { user: { id: profile.id, user_metadata: { role: "admin" } } },
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
});
describe("server authorization", () => {
  it("uses verified identity and database role rather than user metadata", async () => {
    const result = await getAuthorizedUser();
    expect(result.profile.role).toBe("staff");
    await expect(getAuthorizedUser(true)).rejects.toBeInstanceOf(AccessDenied);
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });
  it("denies invalid sessions even if a profile exists", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("expired"),
    });
    await expect(getAuthorizedUser()).rejects.toBeInstanceOf(AccessDenied);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
  it.each([null, { ...profile, active: false }])(
    "denies absent or inactive membership",
    async (value) => {
      mocks.maybeSingle.mockResolvedValue({ data: value, error: null });
      await expect(getAuthorizedUser()).rejects.toBeInstanceOf(AccessDenied);
    },
  );
  it("allows active admins only for privileged actions", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...profile, role: "admin" },
      error: null,
    });
    await expect(getAuthorizedUser(true)).resolves.toMatchObject({
      profile: { role: "admin" },
    });
    expect(mayAccess({ ...profile, active: false, role: "admin" }, true)).toBe(
      false,
    );
  });
});
describe("untrusted inputs", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\n/path",
    "/login?next=bad",
    "/auth/confirm",
  ])("rejects unsafe return path %s", (value) => {
    expect(safeReturnPath(value)).toBe("/");
  });
  it("preserves a protected QR return path", () => {
    expect(safeReturnPath("/q/ab2fe334-f6ab-48ef-8cf0-000000000001")).toBe(
      "/q/ab2fe334-f6ab-48ef-8cf0-000000000001",
    );
  });
  it("validates documents and identities independently of UI controls", () => {
    expect(
      eventInputSchema.safeParse({ packetId: "PR-1", documentIds: [] }).success,
    ).toBe(false);
  });
});
