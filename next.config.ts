import type { NextConfig } from "next";

const onVercel = Boolean(process.env.VERCEL);
const vercelHost = onVercel
  ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  : undefined;
const vercelAuthUrl = vercelHost
  ? vercelHost.startsWith("http")
    ? vercelHost
    : `https://${vercelHost}`
  : undefined;
const configuredAuthUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
const productionAuthUrl =
  configuredAuthUrl && !configuredAuthUrl.includes("localhost") ? configuredAuthUrl : undefined;
const localAuthUrl = configuredAuthUrl?.includes("localhost")
  ? configuredAuthUrl
  : "http://localhost:3000";
const authUrl = onVercel ? productionAuthUrl ?? vercelAuthUrl ?? localAuthUrl : localAuthUrl;

process.env.AUTH_URL = authUrl;
process.env.NEXTAUTH_URL = authUrl;

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@aws-sdk/client-s3", "sharp", "bcryptjs"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  env: {
    AUTH_URL: authUrl,
    NEXTAUTH_URL: authUrl,
  },
};

export default nextConfig;
