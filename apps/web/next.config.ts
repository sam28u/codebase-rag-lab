import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@repo/core", "@repo/db"],
};

export default config;