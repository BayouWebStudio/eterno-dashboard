// Warn about missing critical env vars at startup
const REQUIRED_VARS = ["VITE_CLERK_PUBLISHABLE_KEY", "VITE_CONVEX_HTTP_URL"];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.warn(`[env] WARNING: Required env var ${v} is not set`);
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
