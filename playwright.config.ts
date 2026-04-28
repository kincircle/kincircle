import { defineConfig, devices } from "@playwright/test";
import {
  TEST_APP_PORT,
  TEST_APP_URL,
  TEST_AUTH_SECRET,
  TEST_DATABASE_URL,
  TEST_EMAIL_FROM,
  TEST_RESEND_API_KEY,
} from "./tests/setup/db";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: TEST_APP_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: require.resolve("./tests/setup/global-setup.ts"),
  globalTeardown: require.resolve("./tests/setup/global-teardown.ts"),
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${TEST_APP_PORT}`,
    url: TEST_APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      KINCIRCLE_TEST_MODE: "1",
      TEST_DATABASE_URL: TEST_DATABASE_URL,
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_APP_URL: TEST_APP_URL,
      TEST_AUTH_SECRET: TEST_AUTH_SECRET,
      BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
      BETTER_AUTH_URL: TEST_APP_URL,
      NEXT_PUBLIC_APP_URL: TEST_APP_URL,
      TEST_EMAIL_FROM: TEST_EMAIL_FROM,
      EMAIL_FROM: TEST_EMAIL_FROM,
      TEST_RESEND_API_KEY: TEST_RESEND_API_KEY,
      RESEND_API_KEY: TEST_RESEND_API_KEY,
    },
  },
});
