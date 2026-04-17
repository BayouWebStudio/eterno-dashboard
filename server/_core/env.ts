// Strict startup guard — server must not start without critical secrets
// (Skipped during vitest so unit tests that import routers don't need full env)
if (process.env.NODE_ENV !== "test") {
  const CRITICAL_VARS = ["JWT_SECRET", "OAUTH_SERVER_URL", "DATABASE_URL"] as const;
  const missing = CRITICAL_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `[env] FATAL: Missing required env vars: ${missing.join(", ")}. Server cannot start.`
    );
  }
  if ((process.env.JWT_SECRET ?? "").length < 32) {
    throw new Error(
      "[env] FATAL: JWT_SECRET must be at least 32 characters."
    );
  }
}

// Non-critical vars that are nice to have — warn but don't block startup
const OPTIONAL_VARS = ["VITE_APP_ID", "VITE_CLERK_PUBLISHABLE_KEY", "VITE_CONVEX_HTTP_URL"];
for (const v of OPTIONAL_VARS) {
  if (!process.env[v]) {
    console.warn(`[env] WARNING: Optional env var ${v} is not set`);
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  oAuthServerUrl: process.env.OAUTH_SERVER_URL!,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
