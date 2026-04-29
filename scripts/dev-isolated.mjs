#!/usr/bin/env node

// Starts Next dev with an isolated distDir so it does not contend with the
// default `.next/dev/lock` held by another local server.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
const PORT_SCAN_LIMIT = 1000;
const ISOLATED_DIST_DIR = ".next-dev";

function parsePort(value, source) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${source} must be a TCP port number`);
  }

  return port;
}

function parseArgs(argv) {
  const passthrough = [];
  let requestedPort = process.env.PORT
    ? parsePort(process.env.PORT, "PORT")
    : DEFAULT_PORT;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--port" || arg === "-p") {
      const value = argv[index + 1];

      if (!value) {
        throw new Error(`${arg} requires a value`);
      }

      requestedPort = parsePort(value, arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      requestedPort = parsePort(arg.slice("--port=".length), "--port");
      continue;
    }

    passthrough.push(arg);
  }

  return { passthrough, requestedPort };
}

function isPortAvailable(port) {
  return new Promise((resolveAvailable) => {
    const server = createServer();

    server.unref();
    server.once("error", () => resolveAvailable(false));
    server.listen(port, () => {
      server.close(() => resolveAvailable(true));
    });
  });
}

async function findAvailablePort(startPort) {
  const endPort = Math.min(startPort + PORT_SCAN_LIMIT - 1, 65535);

  for (let port = startPort; port <= endPort; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${endPort}`);
}

function getNextBinary(repoRoot) {
  const binaryName = process.platform === "win32" ? "next.cmd" : "next";
  const nextBinary = resolve(repoRoot, "node_modules", ".bin", binaryName);

  if (!existsSync(nextBinary)) {
    throw new Error("Next.js binary not found. Run npm install first.");
  }

  return nextBinary;
}

function exitCodeForSignal(signal) {
  switch (signal) {
    case "SIGINT":
      return 130;
    case "SIGTERM":
      return 143;
    default:
      return 1;
  }
}

async function main() {
  const { passthrough, requestedPort } = parseArgs(process.argv.slice(2));
  const port = await findAvailablePort(requestedPort);
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const nextBinary = getNextBinary(repoRoot);

  if (port !== requestedPort) {
    console.log(
      `[dev:isolated] Port ${requestedPort} is unavailable; using ${port}.`
    );
  }

  console.log(`[dev:isolated] Next distDir: ${ISOLATED_DIST_DIR}`);

  const child = spawn(
    nextBinary,
    ["dev", "--port", String(port), ...passthrough],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PORT: String(port),
        KINCIRCLE_NEXT_DIST_DIR: ISOLATED_DIST_DIR,
      },
      stdio: "inherit",
    }
  );

  let shuttingDown = false;

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      child.kill(signal);
    });
  }

  child.on("error", (error) => {
    console.error(`[dev:isolated] ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(exitCodeForSignal(signal));
      return;
    }

    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(`[dev:isolated] ${error.message}`);
  process.exit(1);
});
