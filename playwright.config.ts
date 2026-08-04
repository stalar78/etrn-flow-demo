import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  forbidOnly: isCi,
  outputDir: "test-results",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  retries: isCi ? 1 : 0,
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off"
  },
  webServer: [
    {
      command: "corepack pnpm --filter @etrn-flow/api dev",
      reuseExistingServer: !isCi,
      timeout: 60_000,
      url: "http://127.0.0.1:3000/health"
    },
    {
      command: "corepack pnpm --filter @etrn-flow/web dev -- --host 127.0.0.1 --port 5173",
      reuseExistingServer: !isCi,
      timeout: 60_000,
      url: "http://127.0.0.1:5173"
    }
  ],
  workers: 1
});
