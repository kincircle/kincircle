import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth";
import { resetTestDb } from "../setup/db";

test.beforeEach(async () => {
  await resetTestDb();
});

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Sign In to KinCircle")).toBeVisible();
});

test("shows the dashboard for an authenticated user", async ({
  context,
  page,
}) => {
  await authenticateUser(context, {
    email: "organizer@example.com",
    name: "Organizer",
  });

  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: /your reunions/i })
  ).toBeVisible();
  await expect(page.getByText("organizer@example.com")).toBeVisible();
});
