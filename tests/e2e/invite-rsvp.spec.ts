import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth";
import { createTestInvite, createTestReunion } from "../helpers/fixtures";
import { TEST_APP_URL, resetTestDb } from "../setup/db";

test.beforeEach(async () => {
  await resetTestDb();
});

test("guest can RSVP from an invite link and the organizer sees the household", async ({
  browser,
  context,
  page,
}) => {
  const { user: organizer } = await authenticateUser(context, {
    email: "organizer@example.com",
    name: "Organizer",
  });
  const reunion = await createTestReunion(organizer.id, {
    name: "Cousins Weekend",
  });
  const { token } = await createTestInvite(reunion.id, {
    email: "guest@example.com",
  });

  const guestContext = await browser.newContext({ baseURL: TEST_APP_URL });
  const guestPage = await guestContext.newPage();

  await guestPage.goto(`/invite/${token}`);

  await expect(guestPage.getByText("Cousins Weekend")).toBeVisible();

  await guestPage.getByLabel(/your name/i).fill("Guest Household");
  await guestPage.getByRole("button", { name: /yes, we'll be there!/i }).click();
  await guestPage.getByLabel(/party size/i).fill("3");
  await guestPage.getByPlaceholder("City").fill("Indianapolis");
  await guestPage.getByPlaceholder("State").fill("IN");
  await guestPage.getByPlaceholder("Zip").fill("46204");
  await guestPage
    .getByLabel(/dietary needs/i)
    .fill("Vegetarian options appreciated");
  await guestPage.getByLabel(/arrival notes/i).fill("Arriving Friday evening");
  await guestPage.getByLabel(/departure notes/i).fill("Leaving Sunday morning");
  await guestPage.getByRole("button", { name: /submit rsvp/i }).click();

  await expect(guestPage.getByText(/rsvp submitted/i)).toBeVisible();

  await guestContext.close();

  await page.goto(`/reunion/${reunion.id}`);

  await expect(page.getByText("Guest Household").first()).toBeVisible();
  await expect(page.getByText(/party of 3/i)).toBeVisible();
});
