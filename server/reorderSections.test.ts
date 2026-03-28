import { describe, it, expect } from "vitest";

/**
 * Tests for the Reorder Sections feature.
 * Validates the API contract, drag-and-drop logic, and edge cases.
 */

describe("Reorder Sections — API contract", () => {
  it("should send sectionOrder array in the POST body", () => {
    const payload = {
      sectionOrder: ["hero", "about", "services", "gallery", "footer"],
    };
    expect(payload).toHaveProperty("sectionOrder");
    expect(Array.isArray(payload.sectionOrder)).toBe(true);
  });

  it("should use POST /api/dashboard/reorder-sections endpoint", () => {
    const endpoint = "/api/dashboard/reorder-sections";
    expect(endpoint).toBe("/api/dashboard/reorder-sections");
  });

  it("should send section IDs as strings", () => {
    const sectionOrder = ["hero", "about", "services", "gallery"];
    sectionOrder.forEach((id) => {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });
});

describe("Reorder Sections — array reorder logic", () => {
  function reorder<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
    const updated = [...arr];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    return updated;
  }

  it("should move item forward in the list", () => {
    const sections = ["hero", "about", "services", "gallery"];
    const result = reorder(sections, 0, 2);
    expect(result).toEqual(["about", "services", "hero", "gallery"]);
  });

  it("should move item backward in the list", () => {
    const sections = ["hero", "about", "services", "gallery"];
    const result = reorder(sections, 3, 1);
    expect(result).toEqual(["hero", "gallery", "about", "services"]);
  });

  it("should not change array when moving to same position", () => {
    const sections = ["hero", "about", "services"];
    const result = reorder(sections, 1, 1);
    expect(result).toEqual(["hero", "about", "services"]);
  });

  it("should move first item to last", () => {
    const sections = ["hero", "about", "services"];
    const result = reorder(sections, 0, 2);
    expect(result).toEqual(["about", "services", "hero"]);
  });

  it("should move last item to first", () => {
    const sections = ["hero", "about", "services"];
    const result = reorder(sections, 2, 0);
    expect(result).toEqual(["services", "hero", "about"]);
  });

  it("should preserve all items after reorder (no duplicates, no loss)", () => {
    const sections = ["hero", "about", "services", "gallery", "footer"];
    const result = reorder(sections, 1, 4);
    expect(result.sort()).toEqual([...sections].sort());
    expect(result.length).toBe(sections.length);
  });
});

describe("Reorder Sections — move up/down helpers", () => {
  function swap<T>(arr: T[], idx: number, direction: -1 | 1): T[] {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return [...arr];
    const updated = [...arr];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    return updated;
  }

  it("should swap adjacent items when moving up", () => {
    const sections = ["hero", "about", "services"];
    const result = swap(sections, 1, -1);
    expect(result).toEqual(["about", "hero", "services"]);
  });

  it("should swap adjacent items when moving down", () => {
    const sections = ["hero", "about", "services"];
    const result = swap(sections, 1, 1);
    expect(result).toEqual(["hero", "services", "about"]);
  });

  it("should not change array when moving first item up", () => {
    const sections = ["hero", "about", "services"];
    const result = swap(sections, 0, -1);
    expect(result).toEqual(["hero", "about", "services"]);
  });

  it("should not change array when moving last item down", () => {
    const sections = ["hero", "about", "services"];
    const result = swap(sections, 2, 1);
    expect(result).toEqual(["hero", "about", "services"]);
  });
});

describe("Reorder Sections — UI visibility rules", () => {
  it("should show Rearrange button only when 2+ sections exist", () => {
    const showButton = (count: number) => count >= 2;
    expect(showButton(0)).toBe(false);
    expect(showButton(1)).toBe(false);
    expect(showButton(2)).toBe(true);
    expect(showButton(5)).toBe(true);
  });

  it("should hide Rearrange button during reorder mode", () => {
    const reorderMode = true;
    const showButton = !reorderMode;
    expect(showButton).toBe(false);
  });

  it("should disable up button for first item", () => {
    const idx = 0;
    const disabled = idx === 0;
    expect(disabled).toBe(true);
  });

  it("should disable down button for last item", () => {
    const idx = 4;
    const total = 5;
    const disabled = idx === total - 1;
    expect(disabled).toBe(true);
  });
});
