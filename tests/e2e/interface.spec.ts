import { expect, test } from "@playwright/test";
test.skip(
  process.env.DOCTRACK_DEMO_MODE !== "true" ||
    !!process.env.PLAYWRIGHT_PRODUCTION,
  "Mock interface tests require DOCTRACK_DEMO_MODE=true in development. Production never permits demo access.",
);

const packetId = "65da1a81-bb4a-4832-a2bf-000000000001";
test("all screens render without runtime errors or horizontal overflow", async ({
  page,
  isMobile,
}, info) => {
  if (isMobile) await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [route, heading] of [
    ["/", "Tracking dashboard"],
    ["/packets", "PR packets"],
    [`/packets/${packetId}`, "PR 2026-11-0142"],
    ["/scanner", "QR scanner"],
    ["/history", "Movement history"],
    ["/activity", "Activity log"],
    ["/settings", "Destinations & action templates"],
    ["/users", "User administration"],
    ["/login", "Welcome back."],
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
    if (route === "/" || route === "/login" || route.startsWith("/packets/"))
      await page.screenshot({
        path: info.outputPath(
          `${route === "/" ? "dashboard" : route === "/login" ? "login" : "details"}.png`,
        ),
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
});
test("scan → view packet → validate → update → save updates history and dashboard", async ({
  page,
}) => {
  await page.goto("/scanner");
  await page.getByRole("button", { name: "Start demo scan" }).click();
  await page.getByRole("link", { name: "View packet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "PR 2026-11-0142", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update tracking", exact: true })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Save tracking update" }).click();
  await expect(
    sheet.getByText("Choose an action.", { exact: true }),
  ).toBeVisible();
  await sheet
    .getByLabel("Reported location", { exact: false })
    .selectOption("BAC Secretariat");
  await sheet
    .getByLabel("Tracking status", { exact: true })
    .selectOption("Completed");
  await sheet
    .getByLabel("Receipt confirmation", { exact: true })
    .selectOption("Confirmed");
  await sheet
    .getByLabel("Action taken", { exact: false })
    .selectOption("Filed and completed");
  await sheet
    .getByLabel("Tracking note", { exact: false })
    .fill("Received complete packet and filed at BAC Secretariat.");
  await sheet.getByRole("button", { name: "Save tracking update" }).click();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("Tracking updated");
  await expect(
    page
      .getByText("Received complete packet and filed at BAC Secretariat.")
      .first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "All PR packets" }).click();
  const nav = page.getByRole("navigation", {
    name:
      page.viewportSize()!.width < 1024
        ? "Mobile navigation"
        : "Desktop navigation",
  });
  await nav
    .getByRole("link", {
      name: page.viewportSize()!.width < 1024 ? "Home" : "Dashboard",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".metric-card").first().locator(".metric-value"),
  ).toHaveText("06");
  await page.getByRole("link", { name: "View all" }).nth(1).click();
  await expect(page.getByText("Filed and completed").first()).toBeVisible();
});
test("search, empty results, reset, filters and pagination work", async ({
  page,
}) => {
  await page.goto("/packets");
  await page
    .getByLabel("Search packets", { exact: true })
    .fill("not-a-real-pr");
  await expect(
    page.getByText("No packets found", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("7–8 of 8 packets")).toBeVisible();
  await page
    .getByRole("button", { name: "For signature", exact: true })
    .click();
  await expect(page.getByText("1–2 of 2 packets")).toBeVisible();
});
test("loading, empty and recoverable error previews", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Preview state").selectOption("loading");
  await expect(
    page.getByRole("status", { name: "Loading workspace" }),
  ).toBeVisible();
  await page.getByLabel("Preview state").selectOption("empty");
  await expect(page.getByText("Nothing here yet")).toBeVisible();
  await page.getByRole("button", { name: "Show sample data" }).click();
  await page.getByLabel("Preview state").selectOption("error");
  await expect(page.getByText("We couldn’t load this view")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".metric-card")).toHaveCount(4);
});
test("manual lookup and camera unavailable state", async ({ page }) => {
  await page.goto("/scanner");
  await page
    .getByRole("button", { name: "Preview camera unavailable" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Camera access unavailable" }),
  ).toBeVisible();
  await page.getByLabel("PR number or QR identifier").fill("invalid");
  await page.getByRole("button", { name: "Find packet", exact: true }).click();
  await expect(page.locator(".error-note[role=alert]")).toContainText(
    "No sample packet",
  );
  await page.getByLabel("PR number or QR identifier").fill("2026-11-0142");
  await page.getByRole("button", { name: "Find packet", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View packet", exact: true }),
  ).toBeVisible();
});
test("simulated save failure retains input and can be retried", async ({
  page,
}) => {
  await page.goto(`/packets/${packetId}`);
  await page
    .getByRole("button", { name: "Update tracking", exact: true })
    .first()
    .click();
  const sheet = page.getByRole("dialog");
  await sheet
    .getByLabel("Action taken", { exact: false })
    .selectOption("Follow-up recorded");
  await sheet
    .getByLabel("Tracking note", { exact: false })
    .fill("Followed up by phone with receiving staff.");
  await sheet.getByText("Demo testing options").click();
  await sheet.getByRole("switch", { name: "Simulate save failure" }).click();
  await sheet.getByRole("button", { name: "Save tracking update" }).click();
  await expect(sheet.getByRole("alert")).toContainText("demo save failed");
  await expect(sheet.getByLabel("Tracking note", { exact: false })).toHaveValue(
    "Followed up by phone with receiving staff.",
  );
  await sheet.getByRole("switch", { name: "Simulate save failure" }).click();
  await sheet.getByRole("button", { name: "Save tracking update" }).click();
  await expect(sheet).not.toBeVisible();
});
test("destination editing and employee access changes are reflected in session", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Add destination", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Municipal Legal Office");
  await page
    .getByLabel("Office location / details")
    .fill("Second floor, Municipal Hall");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Municipal Legal Office", exact: true }),
  ).toBeVisible();
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "User administration" })
      .click();
  } else
    await page
      .getByRole("link", { name: "User administration", exact: true })
      .click();
  await page.getByRole("button", { name: "Manage Elena Flores" }).click();
  await page.getByRole("switch", { name: "Employee access active" }).click();
  await page.getByRole("button", { name: "Save access" }).click();
  await page.getByLabel("Employee access status").selectOption("inactive");
  await expect(page.getByText("No employees found")).toBeVisible();
});
test("demo login validates and supports simulated errors", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in to DocTrack" }).click();
  await expect(page.locator(".error-note[role=alert]")).toBeVisible();
  await page.getByRole("button", { name: "Use demo credentials" }).click();
  await page.getByLabel("Preview sign-in error").check();
  await page.getByRole("button", { name: "Sign in to DocTrack" }).click();
  await expect(page.locator(".error-note[role=alert]")).toContainText(
    "simulated sign-in error",
  );
  await page.getByLabel("Preview sign-in error").uncheck();
  await page.getByRole("button", { name: "Sign in to DocTrack" }).click();
  await expect(
    page.getByRole("heading", { name: "Tracking dashboard", exact: true }),
  ).toBeVisible();
});
