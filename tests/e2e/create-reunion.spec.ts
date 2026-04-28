import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth";
import { resetTestDb } from "../setup/db";

test.beforeEach(async () => {
  await resetTestDb();
});

test("organizer can create a reunion from the dashboard", async ({
  context,
  page,
}) => {
  await authenticateUser(context, {
    email: "organizer@example.com",
    name: "Organizer",
  });

  await page.goto("/dashboard");

  await page
    .getByRole("button", { name: /new reunion/i })
    .first()
    .click();
  await page.getByLabel(/^name$/i).fill("Summer Reunion 2026");
  await page.getByLabel(/description/i).fill("A long weekend with the whole family");
  await page.getByRole("button", { name: /create reunion/i }).click();

  await expect(page.getByText("Summer Reunion 2026")).toBeVisible();

  await page.getByRole("link", { name: /summer reunion 2026/i }).click();

  await expect(page).toHaveURL(/\/reunion\//);
  await expect(
    page.getByRole("heading", { name: "Summer Reunion 2026" })
  ).toBeVisible();
  await expect(page.getByText(/you are the organizer/i)).toBeVisible();
});
