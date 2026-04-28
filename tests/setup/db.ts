import path from "node:path";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";
import * as schema from "../../src/db/schema";

export const TEST_DB_PORT = 5433;
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  `postgresql://test:test@127.0.0.1:${TEST_DB_PORT}/kincircle_test`;
export const TEST_APP_PORT = 3100;
export const TEST_APP_URL =
  process.env.TEST_APP_URL ?? `http://127.0.0.1:${TEST_APP_PORT}`;
export const TEST_AUTH_SECRET =
  process.env.TEST_AUTH_SECRET ??
  "test-secret-key-for-better-auth-minimum-32-characters";
export const TEST_EMAIL_FROM =
  process.env.TEST_EMAIL_FROM ?? "tests@kincircle.local";
export const TEST_RESEND_API_KEY =
  process.env.TEST_RESEND_API_KEY ?? "test-resend-api-key";

type TestDb = PostgresJsDatabase<typeof schema>;

let testDb: TestDb | null = null;
let testClient: Sql | null = null;

function getClient() {
  if (!testClient) {
    testClient = postgres(TEST_DATABASE_URL, {
      max: 1,
      prepare: false,
    });
  }
  return testClient;
}

export function getTestDb() {
  if (!testDb) {
    testDb = drizzle(getClient(), { schema });
  }
  return testDb;
}

export async function setupTestDb() {
  const sql = getClient();
  await sql`create extension if not exists "pgcrypto"`;
  await migrate(getTestDb(), {
    migrationsFolder: path.join(process.cwd(), "src/db/migrations"),
  });
}

export async function resetTestDb() {
  await getClient().unsafe(`
    TRUNCATE TABLE
      "account",
      "verification",
      "session",
      "date_vote",
      "household_member",
      "invite",
      "reunion_update",
      "date_option",
      "household",
      "reunion",
      "user"
    RESTART IDENTITY CASCADE
  `);
}

export async function closeTestDb() {
  if (testClient) {
    await testClient.end({ timeout: 5 });
    testClient = null;
    testDb = null;
  }
}
