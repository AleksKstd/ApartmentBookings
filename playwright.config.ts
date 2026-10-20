import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const PORT = Number(process.env.E2E_PORT ?? 3210);
const chromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

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
    launchOptions: fs.existsSync(chromium) ? { executablePath: chromium } : {},
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
