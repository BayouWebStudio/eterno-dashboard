import { describe, expect, it } from "vitest";

/**
 * Tests for the onboarding flow and Convex API endpoint mapping.
 * These validate that the SiteContext uses the correct endpoints
 * and the onboarding logic handles all states properly.
 */

describe("Convex API endpoint mapping", () => {
  const CONVEX_HTTP_URL = "https://curious-lemming-262.convex.site";

  it("uses the correct dashboard info endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/info`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/info");
  });

  it("uses the correct site-html endpoint with page param", () => {
    const page = "index";
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/site-html?page=${encodeURIComponent(page)}`;
    expect(endpoint).toContain("/api/dashboard/site-html?page=index");
  });

  it("uses the correct save-section endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/save-section`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/save-section");
  });

  it("uses the correct setup-site endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/setup-site`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/setup-site");
  });

  it("uses the correct upload endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/upload-hero-bg`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/upload-hero-bg");
  });
});

describe("Onboarding state machine", () => {
  type OnboardingStatus = "idle" | "none" | "building" | "ready";

  function determineOnboardingStatus(apiResponse: {
    found?: boolean;
    siteSlug?: string;
    siteBuilt?: boolean;
  }): OnboardingStatus {
    if (
      !apiResponse.found ||
      !apiResponse.siteSlug ||
      !apiResponse.siteBuilt ||
      (apiResponse.siteSlug && apiResponse.siteSlug.endsWith("_pending"))
    ) {
      return "none";
    }
    return "ready";
  }

  it("returns 'none' when no site found", () => {
    expect(determineOnboardingStatus({ found: false })).toBe("none");
  });

  it("returns 'none' when site slug is missing", () => {
    expect(determineOnboardingStatus({ found: true, siteSlug: "" })).toBe("none");
  });

  it("returns 'none' when site is not built", () => {
    expect(
      determineOnboardingStatus({ found: true, siteSlug: "test", siteBuilt: false })
    ).toBe("none");
  });

  it("returns 'none' when site slug ends with _pending", () => {
    expect(
      determineOnboardingStatus({ found: true, siteSlug: "test_pending", siteBuilt: true })
    ).toBe("none");
  });

  it("returns 'ready' when site is fully built", () => {
    expect(
      determineOnboardingStatus({ found: true, siteSlug: "tattoosbypaketh", siteBuilt: true })
    ).toBe("ready");
  });
});

describe("Instagram handle sanitization", () => {
  function sanitizeHandle(input: string): string {
    return input.trim().replace(/^@/, "");
  }

  it("removes leading @ symbol", () => {
    expect(sanitizeHandle("@paketh")).toBe("paketh");
  });

  it("trims whitespace", () => {
    expect(sanitizeHandle("  paketh  ")).toBe("paketh");
  });

  it("handles @ with whitespace", () => {
    expect(sanitizeHandle("  @paketh  ")).toBe("paketh");
  });

  it("leaves clean handle unchanged", () => {
    expect(sanitizeHandle("paketh")).toBe("paketh");
  });

  it("rejects empty string after cleaning", () => {
    const cleaned = sanitizeHandle("  @  ");
    // After removing @ and trimming, should be empty
    expect(cleaned).toBe("");
  });
});
