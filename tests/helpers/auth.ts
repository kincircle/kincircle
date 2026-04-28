import { createHmac, randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { session as sessionTable, user as userTable } from "../../src/db/schema";
import {
  TEST_APP_URL,
  TEST_AUTH_SECRET,
  getTestDb,
} from "../setup/db";

function getSessionCookieName() {
  return TEST_APP_URL.startsWith("https://")
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";
}

function getSessionCookieDomain() {
  return new URL(TEST_APP_URL).hostname;
}

function signSessionToken(token: string) {
  const signature = createHmac("sha256", TEST_AUTH_SECRET)
    .update(token)
    .digest("base64");

  return `${token}.${signature}`;
}

export async function createTestUser(input?: {
  email?: string;
  name?: string;
}) {
  const db = getTestDb();
  const [user] = await db
    .insert(userTable)
    .values({
      id: randomUUID(),
      email: input?.email ?? `user-${randomUUID()}@example.com`,
      name: input?.name ?? "Test User",
      emailVerified: true,
    })
    .returning();

  return user;
}

export async function createTestSession(
  userId: string,
  input?: {
    token?: string;
    expiresAt?: Date;
  }
) {
  const db = getTestDb();
  const [session] = await db
    .insert(sessionTable)
    .values({
      id: randomUUID(),
      token: input?.token ?? randomUUID(),
      userId,
      expiresAt:
        input?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: "127.0.0.1",
      userAgent: "Playwright",
    })
    .returning();

  return session;
}

export async function authenticateUser(
  context: BrowserContext,
  input?: {
    email?: string;
    name?: string;
  }
) {
  const user = await createTestUser(input);
  const session = await createTestSession(user.id);

  await context.addCookies([
    {
      name: getSessionCookieName(),
      value: signSessionToken(session.token),
      domain: getSessionCookieDomain(),
      httpOnly: true,
      path: "/",
      sameSite: "Lax",
      secure: TEST_APP_URL.startsWith("https://"),
      expires: Math.floor(session.expiresAt.getTime() / 1000),
    },
  ]);

  return { user, session };
}
