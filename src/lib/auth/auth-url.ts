/**
 * Resolve the public app URL for Auth.js.
 * On Vercel, always prefer the deployment hostname — never localhost from a mis-set env var.
 * Locally, never use a hosted AUTH_URL — that sends forbidden-route redirects to production login.
 */
export function resolveAuthUrl(): string {
  const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;

  if (process.env.VERCEL) {
    if (configured && !configured.includes("localhost")) {
      return configured;
    }

    const host =
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL;

    if (host) {
      return host.startsWith("http") ? host : `https://${host}`;
    }

    if (configured) return configured;
  }

  if (configured?.includes("localhost")) {
    return configured;
  }

  return "http://localhost:3000";
}

export function applyAuthUrlEnv(): string {
  const authUrl = resolveAuthUrl();
  // Dynamic keys prevent webpack from inlining read-only env literals on the left side.
  const authKey = "AUTH" + "_URL";
  const nextAuthKey = "NEXTAUTH" + "_URL";
  process.env[authKey] = authUrl;
  process.env[nextAuthKey] = authUrl;
  return authUrl;
}

/** Only allow same-site relative redirects after login. */
export function safeCallbackPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
