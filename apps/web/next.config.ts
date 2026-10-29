import type { NextConfig } from "next";
import { resolve } from "node:path";

const config: NextConfig = {
  transpilePackages: ["@repo/core", "@repo/db"],
  outputFileTracingRoot: resolve(__dirname, "../.."),
};

export default config;