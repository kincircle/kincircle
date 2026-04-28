import { expect, test } from "@playwright/test";
import { authenticateUser } from "../helpers/auth";
import { createTestHousehold, createTestReunion } from "../helpers/fixtures";
import { TEST_APP_URL, resetTestDb } from "../setup/db";

test.beforeEach(async () => {
  await resetTestDb();
});

test("organizer can add a date and a claimed member can vote on it", async ({
  browser,
  context,
  page,
}) => {
  const { user: organizer } = await authenticateUser(context, {
    email: "organizer@example.com",
    name: "Organizer",
  });
  const reunion = await createTestReunion(organizer.id, {
    name: "Date Voting Reunion",
  });

  const memberContext = await browser.newContext({ baseURL: TEST_APP_URL });
  const { user: member } = await authenticateUser(memberContext, {
    email: "member@example.com",
    name: "Member",
  });
  await createTestHousehold(reunion.id, {
    claimedByUserId: member.id,
    claimed: true,
    primaryContactName: "Member Household",
    primaryContactEmail: "member@example.com",
  });
  const memberPage = await memberContext.newPage();

  await page.goto(`/reunion/${reunion.id}`);

  await page.getByLabel(/start date/i).fill("2026-06-12");
  await page.getByLabel(/end date/i).fill("2026-06-14");
  await page.getByLabel(/description \(optional\)/i).fill("Summer weekend");
  await page.getByRole("button", { name: /add date option/i }).click();

  await expect(page.getByText("Summer weekend")).toBeVisible();

  await memberPage.goto(`/reunion/${reunion.id}`);

  await expect(memberPage.getByText("Summer weekend")).toBeVisible();
  await memberPage.getByRole("button", { name: "Prefer" }).click();
  await memberPage.getByRole("button", { name: /submit votes/i }).click();

  await expect(
    memberPage.getByRole("button", { name: /update votes/i })
  ).toBeVisible();

  await page.reload();

  await expect(page.getByText("Leading")).toBeVisible();
  await expect(page.getByText("(1 vote)")).toBeVisible();

  await memberContext.close();
});
