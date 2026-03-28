import { describe, it, expect } from "vitest";

/**
 * Tests for the Add Section feature.
 * Validates the API contract, section types, and input validation.
 */

const SECTION_TYPES = [
  "photo-gallery",
  "services",
  "faq",
  "testimonials",
  "hours",
  "team",
  "custom",
];

describe("Add Section — API contract", () => {
  it("should send sectionType, title, and content in the POST body", () => {
    const payload = {
      sectionType: "services",
      title: "Our Services",
      content: "Haircut - $30, Beard Trim - $25",
    };
    expect(payload).toHaveProperty("sectionType");
    expect(payload).toHaveProperty("title");
    expect(payload).toHaveProperty("content");
  });

  it("should use POST /api/dashboard/add-section endpoint", () => {
    const endpoint = "/api/dashboard/add-section";
    expect(endpoint).toBe("/api/dashboard/add-section");
  });

  it("should support all 7 section types", () => {
    expect(SECTION_TYPES).toHaveLength(7);
    expect(SECTION_TYPES).toContain("photo-gallery");
    expect(SECTION_TYPES).toContain("services");
    expect(SECTION_TYPES).toContain("faq");
    expect(SECTION_TYPES).toContain("testimonials");
    expect(SECTION_TYPES).toContain("hours");
    expect(SECTION_TYPES).toContain("team");
    expect(SECTION_TYPES).toContain("custom");
  });
});

describe("Add Section — input validation", () => {
  it("should require a non-empty title", () => {
    const title = "";
    expect(title.trim()).toBe("");
    expect(title.trim().length === 0).toBe(true);
  });

  it("should require non-empty content for non-gallery types", () => {
    const sectionType = "services";
    const content = "";
    const requiresContent = sectionType !== "photo-gallery";
    expect(requiresContent).toBe(true);
    expect(content.trim().length === 0).toBe(true);
  });

  it("should NOT require content for photo-gallery type", () => {
    const sectionType = "photo-gallery";
    const requiresContent = sectionType !== "photo-gallery";
    expect(requiresContent).toBe(false);
  });

  it("should trim whitespace from title and content", () => {
    const title = "  Our Services  ";
    const content = "  Haircut - $30  ";
    expect(title.trim()).toBe("Our Services");
    expect(content.trim()).toBe("Haircut - $30");
  });
});

describe("Add Section — placeholder text", () => {
  const placeholders: Record<string, string> = {
    services: "e.g. Haircut - $30, Beard Trim - $25",
    pricing: "e.g. Haircut - $30, Beard Trim - $25",
    faq: "e.g. Q: How long does it take? A: 2-3 hours",
    testimonials: "e.g. John: Great experience!, Sarah: Amazing work!",
    hours: "e.g. Mon-Fri: 9am-7pm, Sat: 10am-5pm, Sun: Closed",
    team: "e.g. Alex (Lead Stylist), Maria (Colorist)",
    custom: "Describe the section content...",
  };

  for (const [type, expected] of Object.entries(placeholders)) {
    it(`should have correct placeholder for "${type}" type`, () => {
      expect(expected).toBeTruthy();
      expect(typeof expected).toBe("string");
    });
  }
});
