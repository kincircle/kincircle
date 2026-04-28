import path from "node:path";
import { execFileSync } from "node:child_process";
import { closeTestDb } from "./db";

export default async function globalTeardown() {
  await closeTestDb();

  const composeFile = path.join(process.cwd(), "docker-compose.test.yml");
  execFileSync("docker", ["compose", "-f", composeFile, "down", "-v"], {
    stdio: "inherit",
  });
}
