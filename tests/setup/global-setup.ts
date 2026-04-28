import path from "node:path";
import { execFileSync } from "node:child_process";
import { closeTestDb, setupTestDb } from "./db";

export default async function globalSetup() {
  const composeFile = path.join(process.cwd(), "docker-compose.test.yml");

  execFileSync("docker", ["compose", "-f", composeFile, "up", "-d", "--wait"], {
    stdio: "inherit",
  });

  await setupTestDb();
  await closeTestDb();
}
