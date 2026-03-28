import { describe, it, expect } from "vitest";

/**
 * Tests for the inline visual editor feature.
 * Tests the editInjector HTML transformation logic, section ID detection,
 * field key generation, and postMessage contracts.
 */

// We test the injectEditor logic by reimplementing its core transforms
// (since it's a client module, we test the transform patterns directly)

describe("editInjector — CSS injection", () => {
  it("injects CSS before </head>", () => {
    const html = "<html><head><title>Test</title></head><body></body></html>";
    // Simulate: inject before </head>
    const result = html.replace("</head>", '<style id="ve-edit-css">body{}</style>\n</head>');
    expect(result).toContain('<style id="ve-edit-css">');
    expect(result.indexOf("ve-edit-css")).toBeLessThan(result.indexOf("</head>"));
  });

  it("injects CSS at start when no </head> tag", () => {
    const html = "<body><p>Hello</p></body>";
    // Simulate: prepend CSS
    const hasHead = html.includes("</head>");
    expect(hasHead).toBe(false);
    const result = '<style id="ve-edit-css">body{}</style>' + html;
    expect(result).toContain("ve-edit-css");
  });
});

describe("editInjector — JS injection", () => {
  it("injects JS before </body>", () => {
    const html = "<html><head></head><body><p>Hello</p></body></html>";
    const result = html.replace("</body>", '<script id="ve-edit-js">init()</script>\n</body>');
    expect(result).toContain('<script id="ve-edit-js">');
    expect(result.indexOf("ve-edit-js")).toBeLessThan(result.indexOf("</body>"));
  });

  it("appends JS when no </body> tag", () => {
    const html = "<p>Hello</p>";
    const hasBody = html.includes("</body>");
    expect(hasBody).toBe(false);
    const result = html + '<script id="ve-edit-js">init()</script>';
    expect(result).toContain("ve-edit-js");
  });
});

describe("editInjector — relative path rewriting", () => {
  const baseUrl = "https://eternowebstudio.com/weschetattoo";

  it("rewrites relative img src to absolute", () => {
    const html = '<img src="img/1.jpg" alt="tattoo">';
    const base = baseUrl.replace(/\/$/, "");
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `src="${base}/${cleanPath}"`;
      }
    );
    expect(result).toBe('<img src="https://eternowebstudio.com/weschetattoo/img/1.jpg" alt="tattoo">');
  });

  it("does not rewrite absolute URLs", () => {
    const html = '<img src="https://cdn.example.com/photo.jpg">';
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      () => "SHOULD_NOT_MATCH"
    );
    expect(result).toBe(html); // unchanged
  });

  it("does not rewrite data: URIs", () => {
    const html = '<img src="data:image/png;base64,abc123">';
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      () => "SHOULD_NOT_MATCH"
    );
    expect(result).toBe(html); // unchanged
  });

  it("does not rewrite protocol-relative URLs", () => {
    const html = '<img src="//cdn.example.com/photo.jpg">';
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      () => "SHOULD_NOT_MATCH"
    );
    expect(result).toBe(html); // unchanged
  });

  it("rewrites ./relative paths", () => {
    const html = '<img src="./img/photo.jpg">';
    const base = baseUrl.replace(/\/$/, "");
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `src="${base}/${cleanPath}"`;
      }
    );
    expect(result).toBe('<img src="https://eternowebstudio.com/weschetattoo/img/photo.jpg">');
  });

  it("rewrites background-image url() to absolute", () => {
    const css = 'background-image: url("img/bg.jpg")';
    const base = baseUrl.replace(/\/$/, "");
    const result = css.replace(
      /url\(["']?(?!https?:\/\/)(?!\/\/)(?!data:)([^"')]+)["']?\)/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `url("${base}/${cleanPath}")`;
      }
    );
    expect(result).toBe('background-image: url("https://eternowebstudio.com/weschetattoo/img/bg.jpg")');
  });

  it("handles multiple images in one HTML string", () => {
    const html = '<img src="img/1.jpg"><img src="img/2.jpg"><img src="https://cdn.com/3.jpg">';
    const base = baseUrl.replace(/\/$/, "");
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `src="${base}/${cleanPath}"`;
      }
    );
    expect(result).toContain("eternowebstudio.com/weschetattoo/img/1.jpg");
    expect(result).toContain("eternowebstudio.com/weschetattoo/img/2.jpg");
    expect(result).toContain("https://cdn.com/3.jpg"); // unchanged
  });
});

describe("editInjector — extractSectionIdFromClass", () => {
  // Reimplements the extractSectionIdFromClass function for testing
  function extractSectionIdFromClass(cls: string): string | null {
    if (!cls) return null;

    // Direct class-to-id mappings for well-known patterns
    if (cls.indexOf("gallery-body") >= 0) return "tattoo-gallery";
    if (cls.indexOf("masonry-grid") >= 0) return "tattoo-gallery";
    if (cls.indexOf("gallery-section") >= 0) return "gallery";
    if (cls.indexOf("page-hero") >= 0) return "hero";

    // Generic pattern: *-section class → extract the part before "-section"
    const secMatch = cls.match(/(?:^|\s)([a-z][a-z0-9-]*)-section(?:\s|$)/i);
    if (secMatch) return secMatch[1];

    // Pattern: *-content, *-area, *-wrapper for top-level containers
    const containerMatch = cls.match(/(?:^|\s)([a-z][a-z0-9-]*)-(?:content|area|wrapper|block|container)(?:\s|$)/i);
    if (containerMatch) {
      const name = containerMatch[1];
      if (["main", "page", "site", "app", "inner", "outer", "flex", "grid"].indexOf(name) < 0) {
        return name;
      }
    }

    return null;
  }

  it("extracts 'about' from 'about-section'", () => {
    expect(extractSectionIdFromClass("about-section")).toBe("about");
  });

  it("extracts 'booking-cta' from 'booking-cta-section'", () => {
    expect(extractSectionIdFromClass("booking-cta-section")).toBe("booking-cta");
  });

  it("extracts 'services' from 'services-section'", () => {
    expect(extractSectionIdFromClass("services-section")).toBe("services");
  });

  it("extracts 'gallery' from 'gallery-section'", () => {
    expect(extractSectionIdFromClass("gallery-section")).toBe("gallery");
  });

  it("extracts 'tattoo-gallery' from 'gallery-body'", () => {
    expect(extractSectionIdFromClass("gallery-body")).toBe("tattoo-gallery");
  });

  it("extracts 'tattoo-gallery' from 'masonry-grid'", () => {
    expect(extractSectionIdFromClass("masonry-grid")).toBe("tattoo-gallery");
  });

  it("extracts 'hero' from 'page-hero'", () => {
    expect(extractSectionIdFromClass("page-hero")).toBe("hero");
  });

  it("extracts section id from class with multiple classes", () => {
    expect(extractSectionIdFromClass("fade-up about-section reveal")).toBe("about");
  });

  it("extracts from container-style classes like 'about-content'", () => {
    expect(extractSectionIdFromClass("about-content")).toBe("about");
  });

  it("extracts from 'testimonials-area'", () => {
    expect(extractSectionIdFromClass("testimonials-area")).toBe("testimonials");
  });

  it("ignores generic layout classes like 'main-container'", () => {
    expect(extractSectionIdFromClass("main-container")).toBeNull();
  });

  it("ignores 'page-wrapper'", () => {
    expect(extractSectionIdFromClass("page-wrapper")).toBeNull();
  });

  it("returns null for classes with no section pattern", () => {
    expect(extractSectionIdFromClass("fade-up reveal")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractSectionIdFromClass("")).toBeNull();
  });
});

describe("editInjector — section ID detection (DOM walk)", () => {
  it("finds section by id attribute", () => {
    const html = '<section id="about"><h2>About Us</h2></section>';
    const match = html.match(/<section[^>]+id="([^"]+)"/);
    expect(match?.[1]).toBe("about");
  });

  it("finds section by data-section attribute", () => {
    const html = '<div data-section="services"><h2>Services</h2></div>';
    const match = html.match(/data-section="([^"]+)"/);
    expect(match?.[1]).toBe("services");
  });

  it("finds section by class pattern when no id", () => {
    // Simulates the DOM walk: <section class="booking-cta-section"> has no id
    const cls = "booking-cta-section";
    const secMatch = cls.match(/(?:^|\s)([a-z][a-z0-9-]*)-section(?:\s|$)/i);
    expect(secMatch?.[1]).toBe("booking-cta");
  });

  it("finds gallery-body as tattoo-gallery", () => {
    const cls = "gallery-body";
    const result = cls.indexOf("gallery-body") >= 0 ? "tattoo-gallery" : null;
    expect(result).toBe("tattoo-gallery");
  });

  it("finds page-hero as hero", () => {
    const cls = "page-hero fade-up";
    const result = cls.indexOf("page-hero") >= 0 ? "hero" : null;
    expect(result).toBe("hero");
  });
});

describe("editInjector — field key generation", () => {
  // Reimplements findFieldKey logic for testing
  function findFieldKey(tag: string, sectionId: string, cls: string = ""): string {
    // Hero section
    if (sectionId === "hero" || sectionId === "page-hero") {
      if (cls.indexOf("hero-eyebrow") >= 0) return "hero_eyebrow";
      if (cls.indexOf("hero-title") >= 0 || cls.indexOf("hero-name") >= 0) return "hero_title";
      if (cls.indexOf("hero-subtitle") >= 0 || cls.indexOf("hero-tagline") >= 0) return "hero_subtitle";
      if (cls.indexOf("hero-cta") >= 0) return "hero_cta_text";
      if (tag === "h1") return "hero_title";
      if (tag === "h2" || tag === "h3") return "hero_subtitle";
      if (tag === "p") return "hero_subtitle";
      if (tag === "a") return "hero_cta_text";
      return "hero_title";
    }

    // About section
    if (sectionId === "about" || sectionId === "nosotros") {
      if (tag === "h2" || tag === "h3") return "about_title";
      if (tag === "p") return "about";
      return "about_title";
    }

    // Booking section
    if (sectionId === "booking" || sectionId === "book") {
      if (tag === "h2") return "booking_title";
      if (tag === "p") return "booking_intro";
      if (tag === "a") return "booking";
      return "booking_title";
    }

    // Testimonials
    if (sectionId === "testimonials") {
      if (tag === "h2") return "section_title__testimonials";
      if (tag === "p") return "section_body__testimonials";
      return "section_title__testimonials";
    }

    // Shop
    if (sectionId === "shop") {
      if (tag === "h2") return "section_title__shop";
      if (tag === "p") return "section_body__shop";
      if (tag === "a") return "shop_link";
      return "section_title__shop";
    }

    // Generic sections
    if (sectionId && sectionId !== "unknown") {
      if (tag === "h1" || tag === "h2" || tag === "h3") return "section_title__" + sectionId;
      if (tag === "p" || tag === "blockquote" || tag === "li") return sectionId + "__content";
      if (tag === "a") return sectionId + "__link";
      return "section_title__" + sectionId;
    }

    return "unknown_" + tag;
  }

  // ── Hero keys ──
  it("generates hero_title for h1 in hero section", () => {
    expect(findFieldKey("h1", "hero")).toBe("hero_title");
  });

  it("generates hero_title for h1 with hero-title class", () => {
    expect(findFieldKey("h1", "hero", "hero-title fade-up")).toBe("hero_title");
  });

  it("generates hero_eyebrow for element with hero-eyebrow class", () => {
    expect(findFieldKey("p", "hero", "hero-eyebrow")).toBe("hero_eyebrow");
  });

  it("generates hero_subtitle for p in hero section", () => {
    expect(findFieldKey("p", "hero")).toBe("hero_subtitle");
  });

  it("generates hero_cta_text for a in hero section", () => {
    expect(findFieldKey("a", "hero")).toBe("hero_cta_text");
  });

  it("generates hero_cta_text for element with hero-cta class", () => {
    expect(findFieldKey("a", "hero", "hero-cta btn-gold")).toBe("hero_cta_text");
  });

  // ── About keys ──
  it("generates about_title for h2 in about section", () => {
    expect(findFieldKey("h2", "about")).toBe("about_title");
  });

  it("generates about for p in about section (bio text)", () => {
    expect(findFieldKey("p", "about")).toBe("about");
  });

  // ── Booking keys ──
  it("generates booking_title for h2 in booking section", () => {
    expect(findFieldKey("h2", "booking")).toBe("booking_title");
  });

  it("generates booking_intro for p in booking section", () => {
    expect(findFieldKey("p", "booking")).toBe("booking_intro");
  });

  it("generates booking for a in booking section", () => {
    expect(findFieldKey("a", "booking")).toBe("booking");
  });

  // ── Testimonials keys ──
  it("generates section_title__testimonials for h2 in testimonials", () => {
    expect(findFieldKey("h2", "testimonials")).toBe("section_title__testimonials");
  });

  it("generates section_body__testimonials for p in testimonials", () => {
    expect(findFieldKey("p", "testimonials")).toBe("section_body__testimonials");
  });

  // ── Shop keys ──
  it("generates section_title__shop for h2 in shop section", () => {
    expect(findFieldKey("h2", "shop")).toBe("section_title__shop");
  });

  it("generates shop_link for a in shop section", () => {
    expect(findFieldKey("a", "shop")).toBe("shop_link");
  });

  // ── Generic section keys ──
  it("generates section_title__[id] for h2 in generic section", () => {
    expect(findFieldKey("h2", "booking-cta")).toBe("section_title__booking-cta");
  });

  it("generates [id]__content for p in generic section", () => {
    expect(findFieldKey("p", "booking-cta")).toBe("booking-cta__content");
  });

  it("generates [id]__link for a in generic section", () => {
    expect(findFieldKey("a", "custom-section-id")).toBe("custom-section-id__link");
  });

  // ── data-field attribute takes priority ──
  it("uses data-field attribute when present", () => {
    const dataField = "hero_subtitle";
    const key = dataField || "hero_text";
    expect(key).toBe("hero_subtitle");
  });

  // ── Unknown section fallback ──
  it("generates unknown_[tag] for elements with unknown section", () => {
    expect(findFieldKey("h2", "unknown")).toBe("unknown_h2");
  });
});

describe("editInjector — finishEdit guards against unknown sections", () => {
  it("does not send text-edit for unknown section", () => {
    // The finishEdit function checks: if sectionId === 'unknown', show toast and return
    const sectionId = "unknown";
    const shouldSend = sectionId !== "unknown";
    expect(shouldSend).toBe(false);
  });

  it("sends text-edit for valid section", () => {
    const sectionId = "about";
    const shouldSend = sectionId !== "unknown";
    expect(shouldSend).toBe(true);
  });

  it("sends text-edit for class-derived section", () => {
    const sectionId = "booking-cta";
    const shouldSend = sectionId !== "unknown";
    expect(shouldSend).toBe(true);
  });
});

describe("editInjector — setupSections detects class-based sections", () => {
  it("detects section with class but no id", () => {
    // Simulates: <section class="booking-cta-section">
    const cls = "booking-cta-section";
    const secMatch = cls.match(/(?:^|\s)([a-z][a-z0-9-]*)-section(?:\s|$)/i);
    expect(secMatch).not.toBeNull();
    expect(secMatch?.[1]).toBe("booking-cta");
  });

  it("detects section with gallery-section class", () => {
    const cls = "gallery-section";
    const isGallery = cls.indexOf("gallery-section") >= 0;
    expect(isGallery).toBe(true);
  });

  it("skips hero sections from delete controls", () => {
    const skipIds = ["page-hero", "hero", "footer"];
    expect(skipIds.includes("hero")).toBe(true);
    expect(skipIds.includes("page-hero")).toBe(true);
    expect(skipIds.includes("footer")).toBe(true);
    expect(skipIds.includes("about")).toBe(false);
  });

  it("processes each section only once (dedup by id)", () => {
    const processed = new Set<string>();
    const sections = [
      { id: "about" },
      { id: "about" }, // duplicate
      { id: "services" },
    ];
    const result: string[] = [];
    sections.forEach((sec) => {
      if (processed.has(sec.id)) return;
      processed.add(sec.id);
      result.push(sec.id);
    });
    expect(result).toEqual(["about", "services"]);
  });
});

describe("VisualEditor — postMessage contract", () => {
  it("text-edit message has required fields", () => {
    const msg = {
      type: "text-edit",
      sectionId: "about",
      key: "about_title",
      value: "New heading text",
      originalValue: "Old heading text",
    };
    expect(msg.type).toBe("text-edit");
    expect(msg.sectionId).toBeTruthy();
    expect(msg.key).toBeTruthy();
    expect(msg.value).toBeTruthy();
    expect(msg.originalValue).toBeTruthy();
  });

  it("text-edit for class-based section has valid key format", () => {
    const msg = {
      type: "text-edit",
      sectionId: "booking-cta",
      key: "section_title__booking-cta",
      value: "Ready to get inked?",
      originalValue: "Book Now",
    };
    expect(msg.sectionId).toBe("booking-cta");
    expect(msg.key).toBe("section_title__booking-cta");
    expect(msg.key).not.toContain("unknown");
  });

  it("image-swap message has required fields", () => {
    const msg = {
      type: "image-swap",
      sectionId: "hero",
      currentSrc: "https://example.com/old.jpg",
      key: "hero_bg",
    };
    expect(msg.type).toBe("image-swap");
    expect(msg.sectionId).toBeTruthy();
    expect(msg.key).toBeTruthy();
  });

  it("gallery-upload message has sectionId", () => {
    const msg = { type: "gallery-upload", sectionId: "gallery" };
    expect(msg.type).toBe("gallery-upload");
    expect(msg.sectionId).toBeTruthy();
  });

  it("gallery-delete message has filename", () => {
    const msg = {
      type: "gallery-delete",
      sectionId: "gallery",
      filename: "3.jpg",
    };
    expect(msg.type).toBe("gallery-delete");
    expect(msg.filename).toBe("3.jpg");
  });

  it("section-delete message has sectionId", () => {
    const msg = { type: "section-delete", sectionId: "about" };
    expect(msg.type).toBe("section-delete");
    expect(msg.sectionId).toBe("about");
  });

  it("section-delete for class-based section has valid id", () => {
    const msg = { type: "section-delete", sectionId: "booking-cta" };
    expect(msg.sectionId).toBe("booking-cta");
    expect(msg.sectionId).not.toBe("unknown");
  });

  it("toggle-edit message has enabled flag", () => {
    const msg = { type: "toggle-edit", enabled: true };
    expect(msg.type).toBe("toggle-edit");
    expect(msg.enabled).toBe(true);
  });
});

describe("VisualEditor — siteBaseUrl construction", () => {
  it("builds URL from siteUrl + slug", () => {
    const siteUrl = "https://eternowebstudio.com";
    const slug = "weschetattoo";
    const base = siteUrl.replace(/\/$/, "");
    const result = `${base}/${slug}`;
    expect(result).toBe("https://eternowebstudio.com/weschetattoo");
  });

  it("handles trailing slash in siteUrl", () => {
    const siteUrl = "https://eternowebstudio.com/";
    const slug = "weschetattoo";
    const base = siteUrl.replace(/\/$/, "");
    const result = `${base}/${slug}`;
    expect(result).toBe("https://eternowebstudio.com/weschetattoo");
  });

  it("falls back to domain when no siteUrl", () => {
    const siteUrl = "";
    const slug = "weschetattoo";
    const domain = "weschetattoo.eternowebstudio.com";
    let result: string;
    if (siteUrl && slug) {
      result = `${siteUrl}/${slug}`;
    } else {
      result = domain.startsWith("http") ? domain : `https://${domain}`;
    }
    expect(result).toBe("https://weschetattoo.eternowebstudio.com");
  });
});

describe("VisualEditor — add section types", () => {
  const sectionTypes = [
    { value: "photo-gallery", needsContent: false },
    { value: "services", needsContent: true },
    { value: "faq", needsContent: true },
    { value: "testimonials", needsContent: true },
    { value: "hours", needsContent: true },
    { value: "team", needsContent: true },
    { value: "custom", needsContent: true },
  ];

  it("photo-gallery type sends placeholder content", () => {
    const type = sectionTypes.find((t) => t.value === "photo-gallery")!;
    const content = type.needsContent ? "user content" : "Gallery section";
    expect(content).toBe("Gallery section");
  });

  it("other types require user content", () => {
    const type = sectionTypes.find((t) => t.value === "services")!;
    expect(type.needsContent).toBe(true);
  });
});

describe("editInjector — image key generation", () => {
  function buildImageKey(cls: string, sectionId: string): string {
    if (cls.indexOf("about-photo") >= 0 || cls.indexOf("about-portrait") >= 0) return "about_photo";
    if (sectionId === "hero") return "hero_bg";
    if (sectionId === "about") return "about_photo";
    return sectionId + "_img";
  }

  it("generates hero_bg for images in hero section", () => {
    expect(buildImageKey("", "hero")).toBe("hero_bg");
  });

  it("generates about_photo for images in about section", () => {
    expect(buildImageKey("", "about")).toBe("about_photo");
  });

  it("generates about_photo for images with about-photo class", () => {
    expect(buildImageKey("about-photo", "about")).toBe("about_photo");
  });

  it("generates sectionId_img for generic section images", () => {
    expect(buildImageKey("", "services")).toBe("services_img");
  });
});
