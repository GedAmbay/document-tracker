import { expect, test } from "@playwright/test";
test.skip(
  process.env.DOCTRACK_DEMO_MODE === "true" &&
    !process.env.PLAYWRIGHT_PRODUCTION,
  "This suite verifies secure mode, not the explicitly enabled development demo.",
);
test("unconfigured/unauthenticated workspace fails closed, including direct admin and QR URLs", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/packets",
    "/settings",
    "/users",
    "/auth/set-password",
    "/q/ab2fe334-f6ab-48ef-8cf0-000000000001",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Sign in to DocTrack" }),
    ).toBeVisible();
    await expect(page.getByText("Demo workspace", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: /sign up|register account/i }),
    ).toHaveCount(0);
  }
});
test("login rejects external return paths and exposes no public registration", async ({
  page,
}) => {
  await page.goto("/login?next=https://evil.example");
  await expect(page.locator("input[name=next]")).toHaveValue("/");
  await expect(
    page.getByText("Public registration is disabled.", { exact: false }),
  ).toBeVisible();
});
