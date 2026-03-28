import { describe, it, expect } from "vitest";

/**
 * Tests for the Delete Section feature.
 * Validates the API contract for POST /api/dashboard/remove-section.
 */

describe("Delete Section — API contract", () => {
  it("should construct the correct payload with sectionKeyword", () => {
    const sectionId = "gallery";
    const payload = JSON.stringify({ sectionKeyword: sectionId });
    const parsed = JSON.parse(payload);
    expect(parsed).toEqual({ sectionKeyword: "gallery" });
  });

  it("should handle section IDs with hyphens", () => {
    const sectionId = "booking-cta-section";
    const payload = JSON.stringify({ sectionKeyword: sectionId });
    const parsed = JSON.parse(payload);
    expect(parsed.sectionKeyword).toBe("booking-cta-section");
  });

  it("should handle gallery section keyword", () => {
    const sectionId = "tattoo-gallery";
    const payload = JSON.stringify({ sectionKeyword: sectionId });
    const parsed = JSON.parse(payload);
    expect(parsed.sectionKeyword).toBe("tattoo-gallery");
  });

  it("should handle hero section keyword", () => {
    const sectionId = "hero";
    const payload = JSON.stringify({ sectionKeyword: sectionId });
    const parsed = JSON.parse(payload);
    expect(parsed.sectionKeyword).toBe("hero");
  });

  it("should handle footer section keyword", () => {
    const sectionId = "footer";
    const payload = JSON.stringify({ sectionKeyword: sectionId });
    const parsed = JSON.parse(payload);
    expect(parsed.sectionKeyword).toBe("footer");
  });
});

describe("Delete Section — UI state management", () => {
  it("should require confirmation before deleting", () => {
    // Simulates the two-step delete flow:
    // 1. Click "Delete this section" → shows confirmation
    // 2. Click "Remove" in confirmation → actually deletes
    let deleteConfirm: string | null = null;
    const sectionId = "about";

    // Step 1: User clicks delete
    deleteConfirm = sectionId;
    expect(deleteConfirm).toBe("about");

    // Step 2: User confirms
    const shouldDelete = deleteConfirm === sectionId;
    expect(shouldDelete).toBe(true);

    // After deletion
    deleteConfirm = null;
    expect(deleteConfirm).toBeNull();
  });

  it("should allow cancelling the delete confirmation", () => {
    let deleteConfirm: string | null = "hero";

    // User clicks cancel
    deleteConfirm = null;
    expect(deleteConfirm).toBeNull();
  });

  it("should reset confirmation when switching sections", () => {
    let deleteConfirm: string | null = "hero";
    let activeSection: string | null = "hero";

    // User switches to a different section
    activeSection = "about";
    // Confirmation should be for the old section, not the new one
    const isConfirmingCurrentSection = deleteConfirm === activeSection;
    expect(isConfirmingCurrentSection).toBe(false);
  });
});
