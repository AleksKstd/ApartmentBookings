import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
// Uses Playwright's own browser (`npx playwright install chromium`). To use a browser installed
// elsewhere, e.g. a preinstalled Chromium in a sandbox, set PLAYWRIGHT_CHROMIUM_PATH.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    // Production build in demo mode with an isolated, throwaway data directory.
    command: `rm -rf .e2e-data && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/bg`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DEMO_MODE: "true", DEMO_DATA_DIR: ".e2e-data", ADMIN_SESSION_SECRET: "e2e-test-secret-that-is-long-enough-123" },
  },
});
