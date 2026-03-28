import { describe, expect, it } from "vitest";

describe("Environment secrets", () => {
  it("VITE_CLERK_PUBLISHABLE_KEY is set and starts with pk_", () => {
    const key = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    expect(key?.startsWith("pk_test_") || key?.startsWith("pk_live_")).toBe(true);
  });

  it("VITE_CONVEX_HTTP_URL is set and is a valid URL", () => {
    const url = process.env.VITE_CONVEX_HTTP_URL;
    expect(url).toBeDefined();
    expect(url).not.toBe("");
    expect(url?.startsWith("https://")).toBe(true);
    expect(url).toContain("convex.site");
  });
});
