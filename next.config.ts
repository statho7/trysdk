import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Vite preview proxy intentionally uses a trailing slash as its base.
  // Do not canonicalize it away or Vite and Next will redirect to each other.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
