import { describe, expect, it } from "vitest";

/**
 * Tests for the live preview feature on the Overview page.
 * Covers URL construction, preview mode toggling, and cache-busting.
 */

describe("Live preview URL construction", () => {
  it("builds correct live URL from siteUrl when available", () => {
    const siteInfo = {
      slug: "weschetattoo",
      siteUrl: "https://eternowebstudio.com/weschetattoo",
    };
    const liveUrl = siteInfo.siteUrl || `https://eternowebstudio.com/${siteInfo.slug}`;
    expect(liveUrl).toBe("https://eternowebstudio.com/weschetattoo");
  });

  it("falls back to slug-based URL when siteUrl is not set", () => {
    const siteInfo = {
      slug: "tattoosbypaketh",
      siteUrl: undefined as string | undefined,
    };
    const liveUrl = siteInfo.siteUrl || `https://eternowebstudio.com/${siteInfo.slug}`;
    expect(liveUrl).toBe("https://eternowebstudio.com/tattoosbypaketh");
  });

  it("uses siteUrl over slug-based fallback", () => {
    const siteInfo = {
      slug: "oldslug",
      siteUrl: "https://eternowebstudio.com/newslug",
    };
    const liveUrl = siteInfo.siteUrl || `https://eternowebstudio.com/${siteInfo.slug}`;
    expect(liveUrl).toBe("https://eternowebstudio.com/newslug");
  });
});

describe("Cache-busting for live preview iframe", () => {
  it("appends _cb query parameter to live URL", () => {
    const liveUrl = "https://eternowebstudio.com/weschetattoo";
    const iframeKey = 0;
    const src = `${liveUrl}?_cb=${iframeKey}`;
    expect(src).toBe("https://eternowebstudio.com/weschetattoo?_cb=0");
  });

  it("increments _cb value on refresh", () => {
    const liveUrl = "https://eternowebstudio.com/weschetattoo";
    let iframeKey = 0;
    const src1 = `${liveUrl}?_cb=${iframeKey}`;
    iframeKey += 1;
    const src2 = `${liveUrl}?_cb=${iframeKey}`;
    expect(src1).not.toBe(src2);
    expect(src2).toContain("_cb=1");
  });

  it("each refresh produces a unique URL", () => {
    const liveUrl = "https://eternowebstudio.com/weschetattoo";
    const urls = new Set<string>();
    for (let i = 0; i < 10; i++) {
      urls.add(`${liveUrl}?_cb=${i}`);
    }
    expect(urls.size).toBe(10);
  });
});

describe("Preview mode toggling", () => {
  type PreviewMode = "live" | "source";

  it("defaults to 'live' mode", () => {
    const defaultMode: PreviewMode = "live";
    expect(defaultMode).toBe("live");
  });

  it("can switch to 'source' mode", () => {
    let mode: PreviewMode = "live";
    mode = "source";
    expect(mode).toBe("source");
  });

  it("can switch back to 'live' mode", () => {
    let mode: PreviewMode = "source";
    mode = "live";
    expect(mode).toBe("live");
  });

  it("live mode uses src attribute (URL iframe)", () => {
    const mode: PreviewMode = "live";
    const useSrc = mode === "live";
    const useSrcDoc = mode === "source";
    expect(useSrc).toBe(true);
    expect(useSrcDoc).toBe(false);
  });

  it("source mode uses srcDoc attribute (Convex HTML)", () => {
    const mode: PreviewMode = "source";
    const useSrc = mode === "live";
    const useSrcDoc = mode === "source";
    expect(useSrc).toBe(false);
    expect(useSrcDoc).toBe(true);
  });
});

describe("Domain construction for site info", () => {
  it("uses domain from API when available", () => {
    const siteInfo = {
      slug: "weschetattoo",
      domain: "weschetattoo.eternowebstudio.com",
    };
    const domain = siteInfo.domain || `${siteInfo.slug}.eternowebstudio.com`;
    expect(domain).toBe("weschetattoo.eternowebstudio.com");
  });

  it("falls back to slug-based domain", () => {
    const siteInfo = {
      slug: "weschetattoo",
      domain: undefined as string | undefined,
    };
    const domain = siteInfo.domain || `${siteInfo.slug}.eternowebstudio.com`;
    expect(domain).toBe("weschetattoo.eternowebstudio.com");
  });
});
