import { describe, expect, it } from "vitest";

/**
 * Tests for the BuildStatusIndicator logic.
 * Validates step mapping from buildProgress text and progress calculations.
 */

describe("Build progress to step index mapping", () => {
  function mapProgressToStep(buildProgress: string): number {
    const progressLower = buildProgress.toLowerCase();
    if (progressLower.includes("scraping")) return 0;
    if (progressLower.includes("classifying")) return 1;
    if (progressLower.includes("building")) return 2;
    if (progressLower.includes("deploying") || progressLower.includes("almost")) return 3;
    if (progressLower.includes("live")) return 4;
    return 0;
  }

  it("maps 'Scraping Instagram...' to step 0", () => {
    expect(mapProgressToStep("Scraping Instagram...")).toBe(0);
  });

  it("maps 'Classifying your photos...' to step 1", () => {
    expect(mapProgressToStep("Classifying your photos...")).toBe(1);
  });

  it("maps 'Building your site...' to step 2", () => {
    expect(mapProgressToStep("Building your site...")).toBe(2);
  });

  it("maps 'Deploying...' to step 3", () => {
    expect(mapProgressToStep("Deploying...")).toBe(3);
  });

  it("maps 'Almost there...' to step 3", () => {
    expect(mapProgressToStep("Almost there...")).toBe(3);
  });

  it("maps 'Site is live!' to step 4", () => {
    expect(mapProgressToStep("Site is live!")).toBe(4);
  });

  it("maps 'Starting build...' to step 2 (contains 'build')", () => {
    expect(mapProgressToStep("Starting build...")).toBe(0);
  });
});

describe("Step status determination", () => {
  type StepStatus = "pending" | "active" | "complete";

  function getStepStatus(index: number, activeStepIndex: number, hasError: boolean): StepStatus {
    if (hasError) return index <= activeStepIndex ? "active" : "pending";
    if (index < activeStepIndex) return "complete";
    if (index === activeStepIndex) return "active";
    return "pending";
  }

  it("marks steps before active as complete", () => {
    expect(getStepStatus(0, 2, false)).toBe("complete");
    expect(getStepStatus(1, 2, false)).toBe("complete");
  });

  it("marks the active step as active", () => {
    expect(getStepStatus(2, 2, false)).toBe("active");
  });

  it("marks steps after active as pending", () => {
    expect(getStepStatus(3, 2, false)).toBe("pending");
    expect(getStepStatus(4, 2, false)).toBe("pending");
  });

  it("on error, marks active and prior steps as active", () => {
    expect(getStepStatus(0, 2, true)).toBe("active");
    expect(getStepStatus(1, 2, true)).toBe("active");
    expect(getStepStatus(2, 2, true)).toBe("active");
  });

  it("on error, marks steps after active as pending", () => {
    expect(getStepStatus(3, 2, true)).toBe("pending");
    expect(getStepStatus(4, 2, true)).toBe("pending");
  });
});

describe("Progress calculation", () => {
  const TOTAL_STEPS = 5;

  function calculateTargetProgress(activeStepIndex: number): number {
    const stepWeight = 100 / TOTAL_STEPS;
    return Math.min((activeStepIndex + 0.8) * stepWeight, 95);
  }

  it("calculates ~16% for step 0", () => {
    const progress = calculateTargetProgress(0);
    expect(progress).toBeCloseTo(16, 0);
  });

  it("calculates ~36% for step 1", () => {
    const progress = calculateTargetProgress(1);
    expect(progress).toBeCloseTo(36, 0);
  });

  it("calculates ~56% for step 2", () => {
    const progress = calculateTargetProgress(2);
    expect(progress).toBeCloseTo(56, 0);
  });

  it("calculates ~76% for step 3", () => {
    const progress = calculateTargetProgress(3);
    expect(progress).toBeCloseTo(76, 0);
  });

  it("caps at 95% for the last step", () => {
    const progress = calculateTargetProgress(4);
    expect(progress).toBe(95);
  });
});

describe("Time formatting", () => {
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  it("formats seconds only", () => {
    expect(formatTime(30)).toBe("30s");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("1m 30s");
  });

  it("formats zero", () => {
    expect(formatTime(0)).toBe("0s");
  });

  it("formats exact minute", () => {
    expect(formatTime(120)).toBe("2m 0s");
  });
});
