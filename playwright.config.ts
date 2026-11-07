import { defineConfig, devices } from "@playwright/test";
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: externalBaseURL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_PRODUCTION
          ? "npm run start -- --hostname localhost --port 3100"
          : "npm run dev -- --hostname localhost --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
