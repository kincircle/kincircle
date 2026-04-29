import type { NextConfig } from "next";

function getDistDir() {
  // Used by `npm run dev:isolated` to avoid the default `.next/dev/lock`.
  const distDir = process.env.KINCIRCLE_NEXT_DIST_DIR?.trim();

  if (!distDir) {
    return undefined;
  }

  if (!/^\.next[-a-zA-Z0-9_]*$/.test(distDir)) {
    throw new Error(
      "KINCIRCLE_NEXT_DIST_DIR must be a relative .next-prefixed directory name"
    );
  }

  return distDir;
}

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: getDistDir(),
};

export default nextConfig;
