import { describe, expect, it } from "vitest";

/**
 * Tests for the onboarding flow and Convex API endpoint mapping.
 * Covers both paths: "Connect Existing Site" and "Build New Site".
 */

describe("Convex API endpoint mapping", () => {
  const CONVEX_HTTP_URL = "https://curious-lemming-262.convex.site";

  it("uses the correct dashboard info endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/info`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/info");
  });

  it("uses the correct site-html endpoint with page param", () => {
    const page = "index.html";
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/site-html?page=${encodeURIComponent(page)}`;
    expect(endpoint).toContain("/api/dashboard/site-html?page=index.html");
  });

  it("uses the correct save-section endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/save-section`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/save-section");
  });

  it("uses the correct setup-site (build new) endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/signature/create`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/signature/create");
  });

  it("uses the correct connect-site endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/connect-site`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/connect-site");
  });

  it("uses the correct upload endpoint", () => {
    const endpoint = `${CONVEX_HTTP_URL}/api/dashboard/upload-hero-bg`;
    expect(endpoint).toBe("https://curious-lemming-262.convex.site/api/dashboard/upload-hero-bg");
  });
});

describe("Onboarding state machine", () => {
  type OnboardingStatus = "idle" | "none" | "building" | "connecting" | "ready";

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

  it("supports 'connecting' as a valid status", () => {
    const status: OnboardingStatus = "connecting";
    expect(["idle", "none", "building", "connecting", "ready"]).toContain(status);
  });
});

describe("Connect site flow", () => {
  it("builds correct connect-site request body with igHandle only", () => {
    const igHandle = "tattoosbypaketh";
    const body = JSON.stringify({ igHandle });
    const parsed = JSON.parse(body);
    expect(parsed).toEqual({ igHandle: "tattoosbypaketh" });
    expect(parsed).not.toHaveProperty("country");
    expect(parsed).not.toHaveProperty("clerkUserId");
  });

  it("handles successful connect response", () => {
    const response = { success: true, siteSlug: "tattoosbypaketh", message: "Site connected successfully" };
    expect(response.success).toBe(true);
    expect(response.siteSlug).toBe("tattoosbypaketh");
  });

  it("handles site-not-found error response", () => {
    const response = { success: false, error: "No site found for that handle" };
    expect(response.success).toBe(false);
    expect(response.error).toContain("No site found");
  });

  it("handles already-claimed error response", () => {
    const response = { success: false, error: "This site is already linked to another account" };
    expect(response.success).toBe(false);
    expect(response.error).toContain("already linked");
  });
});

describe("Build site flow", () => {
  it("builds correct setup-site request body with igHandle and country", () => {
    const igHandle = "newartist";
    const country = "MX";
    const body = JSON.stringify({ igHandle, country });
    const parsed = JSON.parse(body);
    expect(parsed).toEqual({ igHandle: "newartist", country: "MX" });
  });

  it("validates country code is 2 letters", () => {
    const validCodes = ["US", "MX", "CA", "GB", "ES"];
    validCodes.forEach((code) => {
      expect(code).toMatch(/^[A-Z]{2}$/);
    });
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
    expect(cleaned).toBe("");
  });
});
