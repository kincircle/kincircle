import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth";
import { createTestHousehold, createTestReunion } from "../helpers/fixtures";
import { resetTestDb } from "../setup/db";

test.beforeEach(async () => {
  await resetTestDb();
});

test("organizer can lock a date and finalize the reunion plan", async ({
  context,
  page,
}) => {
  const { user: organizer } = await authenticateUser(context, {
    email: "organizer@example.com",
    name: "Organizer",
  });
  const reunion = await createTestReunion(organizer.id, {
    name: "Finalize Reunion",
  });

  await createTestHousehold(reunion.id, {
    primaryContactName: "Chicago Household",
    primaryContactEmail: "household@example.com",
    rsvpStatus: "yes",
    lat: 41.8864,
    lng: -87.6186,
  });

  await page.goto(`/reunion/${reunion.id}`);

  await page.getByLabel(/start date/i).fill("2026-07-10");
  await page.getByLabel(/end date/i).fill("2026-07-12");
  await page.getByLabel(/description \(optional\)/i).fill("Peak summer");
  await page.getByRole("button", { name: /add date option/i }).click();

  await expect(page.getByText("Peak summer")).toBeVisible();

  await page.reload();

  const lockButton = page.getByRole("button", { name: /lock date/i });
  await expect(lockButton).toBeEnabled();
  await lockButton.click();

  await expect(
    page.getByRole("button", { name: /finalize reunion/i })
  ).toBeVisible();
  await expect(page.getByText(/suggested location/i).first()).toBeVisible();

  await page.getByRole("button", { name: /finalize reunion/i }).click();

  await expect(
    page.getByRole("button", { name: /view final plan/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /view final plan/i }).click();

  await expect(page).toHaveURL(new RegExp(`/reunion/${reunion.id}/plan$`));
  await expect(page.getByRole("heading", { name: /finalize reunion/i })).toBeVisible();
  await expect(page.getByText(/who's coming/i)).toBeVisible();
});
