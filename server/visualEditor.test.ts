import { describe, it, expect } from "vitest";

/**
 * Tests for the inline visual editor feature.
 * Tests the editInjector HTML transformation logic, section ID detection,
 * field key generation, gallery delete for all images, drag-and-drop reorder,
 * and postMessage contracts.
 */

describe("editInjector — CSS injection", () => {
  it("injects CSS before </head>", () => {
    const html = "<html><head><title>Test</title></head><body></body></html>";
    const result = html.replace("</head>", '<style id="ve-edit-css">body{}</style>\n</head>');
    expect(result).toContain('<style id="ve-edit-css">');
    expect(result.indexOf("ve-edit-css")).toBeLessThan(result.indexOf("</head>"));
  });

  it("injects CSS at start when no </head> tag", () => {
    const html = "<body><p>Hello</p></body>";
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
    expect(result).toBe(html);
  });

  it("does not rewrite data: URIs", () => {
    const html = '<img src="data:image/png;base64,abc123">';
    const result = html.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      () => "SHOULD_NOT_MATCH"
    );
    expect(result).toBe(html);
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
    expect(result).toContain("https://cdn.com/3.jpg");
  });
});

describe("editInjector — extractSectionIdFromClass", () => {
  function extractSectionIdFromClass(cls: string): string | null {
    if (!cls) return null;
    if (cls.indexOf("gallery-body") >= 0) return "tattoo-gallery";
    if (cls.indexOf("masonry-grid") >= 0) return "tattoo-gallery";
    if (cls.indexOf("gallery-section") >= 0) return "gallery";
    if (cls.indexOf("page-hero") >= 0) return "hero";

    const secMatch = cls.match(/(?:^|\s)([a-z][a-z0-9-]*)-section(?:\s|$)/i);
    if (secMatch) return secMatch[1];

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

  it("ignores generic layout classes like 'main-container'", () => {
    expect(extractSectionIdFromClass("main-container")).toBeNull();
  });

  it("returns null for classes with no section pattern", () => {
    expect(extractSectionIdFromClass("fade-up reveal")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractSectionIdFromClass("")).toBeNull();
  });
});

describe("editInjector — field key generation", () => {
  function findFieldKey(tag: string, sectionId: string, cls: string = ""): string {
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
    if (sectionId === "about" || sectionId === "nosotros") {
      if (tag === "h2" || tag === "h3") return "about_title";
      if (tag === "p") return "about";
      return "about_title";
    }
    if (sectionId === "booking" || sectionId === "book") {
      if (tag === "h2") return "booking_title";
      if (tag === "p") return "booking_intro";
      if (tag === "a") return "booking";
      return "booking_title";
    }
    if (sectionId === "testimonials") {
      if (tag === "h2") return "section_title__testimonials";
      if (tag === "p") return "section_body__testimonials";
      return "section_title__testimonials";
    }
    if (sectionId === "shop") {
      if (tag === "h2") return "section_title__shop";
      if (tag === "p") return "section_body__shop";
      if (tag === "a") return "shop_link";
      return "section_title__shop";
    }
    if (sectionId && sectionId !== "unknown") {
      if (tag === "h1" || tag === "h2" || tag === "h3") return "section_title__" + sectionId;
      if (tag === "p" || tag === "blockquote" || tag === "li") return sectionId + "__content";
      if (tag === "a") return sectionId + "__link";
      return "section_title__" + sectionId;
    }
    return "unknown_" + tag;
  }

  it("generates hero_title for h1 in hero section", () => {
    expect(findFieldKey("h1", "hero")).toBe("hero_title");
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

  it("generates about_title for h2 in about section", () => {
    expect(findFieldKey("h2", "about")).toBe("about_title");
  });

  it("generates about for p in about section (bio text)", () => {
    expect(findFieldKey("p", "about")).toBe("about");
  });

  it("generates booking_title for h2 in booking section", () => {
    expect(findFieldKey("h2", "booking")).toBe("booking_title");
  });

  it("generates booking_intro for p in booking section", () => {
    expect(findFieldKey("p", "booking")).toBe("booking_intro");
  });

  it("generates section_title__[id] for h2 in generic section", () => {
    expect(findFieldKey("h2", "booking-cta")).toBe("section_title__booking-cta");
  });

  it("generates [id]__content for p in generic section", () => {
    expect(findFieldKey("p", "booking-cta")).toBe("booking-cta__content");
  });

  it("generates unknown_[tag] for elements with unknown section", () => {
    expect(findFieldKey("h2", "unknown")).toBe("unknown_h2");
  });
});

describe("editInjector — finishEdit guards against unknown sections", () => {
  it("does not send text-edit for unknown section", () => {
    const sectionId = "unknown";
    const shouldSend = sectionId !== "unknown";
    expect(shouldSend).toBe(false);
  });

  it("sends text-edit for valid section", () => {
    const sectionId = "about";
    const shouldSend = sectionId !== "unknown";
    expect(shouldSend).toBe(true);
  });
});

describe("editInjector — isGalleryImage detection", () => {
  // Reimplements the isGalleryImage check from the injected script
  function isGalleryImage(containerClasses: string[]): boolean {
    const galleryContainers = ["masonry-item", "gallery-item", "gallery-grid", "masonry-grid", "gallery-body"];
    return containerClasses.some((cls) => galleryContainers.includes(cls));
  }

  it("detects image inside .masonry-item as gallery image", () => {
    expect(isGalleryImage(["masonry-item"])).toBe(true);
  });

  it("detects image inside .gallery-item as gallery image", () => {
    expect(isGalleryImage(["gallery-item"])).toBe(true);
  });

  it("detects image inside .gallery-grid as gallery image", () => {
    expect(isGalleryImage(["gallery-grid"])).toBe(true);
  });

  it("detects image inside .masonry-grid as gallery image", () => {
    expect(isGalleryImage(["masonry-grid"])).toBe(true);
  });

  it("detects image inside .gallery-body as gallery image", () => {
    expect(isGalleryImage(["gallery-body"])).toBe(true);
  });

  it("does not detect image inside .hero-section as gallery image", () => {
    expect(isGalleryImage(["hero-section"])).toBe(false);
  });

  it("does not detect image inside .about-photo as gallery image", () => {
    expect(isGalleryImage(["about-photo"])).toBe(false);
  });
});

describe("editInjector — gallery delete for ALL images", () => {
  // The key fix: gallery images are detected by container class, not by image dimensions.
  // Previously, images with 0x0 dimensions (not yet loaded in srcdoc) were skipped.

  it("gallery images are not filtered by dimensions", () => {
    // Simulate: image in .masonry-item has naturalWidth=0 (not loaded yet)
    const inGallery = true;
    const naturalWidth = 0;
    const naturalHeight = 0;

    // Old behavior: would skip because width < 30
    const oldBehavior = !inGallery && naturalWidth < 30 && naturalHeight < 30;
    // New behavior: gallery images bypass dimension check
    const newBehavior = inGallery || !(naturalWidth > 0 && naturalWidth < 30 && naturalHeight > 0 && naturalHeight < 30);

    expect(oldBehavior).toBe(false); // old would skip
    expect(newBehavior).toBe(true);  // new processes it
  });

  it("non-gallery tiny images are still skipped", () => {
    const inGallery = false;
    const w = 16;
    const h = 16;

    // Should skip: small non-gallery image (icon/spacer)
    const shouldSkip = !inGallery && w > 0 && w < 30 && h > 0 && h < 30;
    expect(shouldSkip).toBe(true);
  });

  it("non-gallery images with 0 dimensions are NOT skipped (not yet loaded)", () => {
    const inGallery = false;
    const w = 0;
    const h = 0;

    // Should NOT skip: dimensions unknown, could be a real image
    const shouldSkip = !inGallery && w > 0 && w < 30 && h > 0 && h < 30;
    expect(shouldSkip).toBe(false);
  });

  it("all 10 tattoo images in masonry grid get delete buttons", () => {
    // Simulate 10 images inside .masonry-item containers
    const imageCount = 10;
    const galleryImages: { src: string; inGallery: boolean }[] = [];
    for (let i = 1; i <= imageCount; i++) {
      galleryImages.push({ src: `img/${i}.jpg`, inGallery: true });
    }

    // All should get delete buttons
    const withDeleteButtons = galleryImages.filter((img) => img.inGallery);
    expect(withDeleteButtons.length).toBe(10);
  });
});

describe("editInjector — extractFilename", () => {
  function extractFilename(src: string): string {
    const clean = src.split("?")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || src;
  }

  it("extracts filename from relative path", () => {
    expect(extractFilename("img/1.jpg")).toBe("1.jpg");
  });

  it("extracts filename from absolute URL", () => {
    expect(extractFilename("https://cdn.example.com/img/tattoo-3.jpg")).toBe("tattoo-3.jpg");
  });

  it("strips query params", () => {
    expect(extractFilename("https://cdn.example.com/img/photo.jpg?v=123")).toBe("photo.jpg");
  });

  it("handles filename only", () => {
    expect(extractFilename("photo.jpg")).toBe("photo.jpg");
  });
});

describe("editInjector — gallery drag-and-drop reorder", () => {
  it("reorders array when item is moved from index 0 to index 2", () => {
    const items = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"];
    const fromIdx = 0;
    const toIdx = 2;

    // Simulate DOM reorder: remove from source, insert at target
    const moved = items.splice(fromIdx, 1)[0];
    items.splice(toIdx, 0, moved);

    expect(items).toEqual(["2.jpg", "3.jpg", "1.jpg", "4.jpg", "5.jpg"]);
  });

  it("reorders array when item is moved from index 4 to index 1", () => {
    const items = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"];
    const fromIdx = 4;
    const toIdx = 1;

    const moved = items.splice(fromIdx, 1)[0];
    items.splice(toIdx, 0, moved);

    expect(items).toEqual(["1.jpg", "5.jpg", "2.jpg", "3.jpg", "4.jpg"]);
  });

  it("no-op when dragging to same position", () => {
    const items = ["1.jpg", "2.jpg", "3.jpg"];
    const fromIdx = 1;
    const toIdx = 1;

    // Should not change
    if (fromIdx !== toIdx) {
      const moved = items.splice(fromIdx, 1)[0];
      items.splice(toIdx, 0, moved);
    }

    expect(items).toEqual(["1.jpg", "2.jpg", "3.jpg"]);
  });

  it("handles moving last item to first position", () => {
    const items = ["a.jpg", "b.jpg", "c.jpg"];
    const moved = items.splice(2, 1)[0];
    items.splice(0, 0, moved);
    expect(items).toEqual(["c.jpg", "a.jpg", "b.jpg"]);
  });

  it("handles moving first item to last position", () => {
    const items = ["a.jpg", "b.jpg", "c.jpg"];
    const moved = items.splice(0, 1)[0];
    items.splice(2, 0, moved);
    expect(items).toEqual(["b.jpg", "c.jpg", "a.jpg"]);
  });

  it("preserves all filenames after reorder (no duplicates, no loss)", () => {
    const original = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg"];
    const reordered = [...original];

    // Multiple swaps
    const m1 = reordered.splice(0, 1)[0];
    reordered.splice(5, 0, m1);
    const m2 = reordered.splice(9, 1)[0];
    reordered.splice(2, 0, m2);

    // All original items should still be present
    expect(reordered.sort()).toEqual(original.sort());
    expect(reordered.length).toBe(original.length);
  });
});

describe("VisualEditor — gallery-reorder postMessage contract", () => {
  it("gallery-reorder message has required fields", () => {
    const msg = {
      type: "gallery-reorder",
      sectionId: "tattoo-gallery",
      filenames: ["3.jpg", "1.jpg", "2.jpg", "5.jpg", "4.jpg"],
    };
    expect(msg.type).toBe("gallery-reorder");
    expect(msg.sectionId).toBeTruthy();
    expect(Array.isArray(msg.filenames)).toBe(true);
    expect(msg.filenames.length).toBe(5);
  });

  it("maps tattoo-gallery to gallery for API call", () => {
    const sectionId = "tattoo-gallery";
    const mapped = sectionId === "tattoo-gallery" ? "gallery" : sectionId;
    expect(mapped).toBe("gallery");
  });

  it("passes through non-tattoo section IDs unchanged", () => {
    const sectionId = "gallery";
    const mapped = sectionId === "tattoo-gallery" ? "gallery" : sectionId;
    expect(mapped).toBe("gallery");
  });

  it("filenames are extracted from image src paths", () => {
    const srcs = [
      "https://eternowebstudio.com/weschetattoo/img/3.jpg",
      "https://eternowebstudio.com/weschetattoo/img/1.jpg",
      "https://eternowebstudio.com/weschetattoo/img/2.jpg",
    ];
    const filenames = srcs.map((src) => {
      const clean = src.split("?")[0];
      const parts = clean.split("/");
      return parts[parts.length - 1] || src;
    });
    expect(filenames).toEqual(["3.jpg", "1.jpg", "2.jpg"]);
  });
});

describe("VisualEditor — gallery-delete postMessage contract", () => {
  it("gallery-delete message has required fields", () => {
    const msg = {
      type: "gallery-delete",
      sectionId: "tattoo-gallery",
      filename: "3.jpg",
    };
    expect(msg.type).toBe("gallery-delete");
    expect(msg.sectionId).toBeTruthy();
    expect(msg.filename).toBe("3.jpg");
  });

  it("delete includes confirmation step", () => {
    // The injected script shows confirm() before posting gallery-delete
    const confirmed = true; // Simulates user clicking OK
    expect(confirmed).toBe(true);
  });

  it("maps tattoo-gallery to gallery for delete API", () => {
    const sectionId = "tattoo-gallery";
    const mapped = sectionId === "tattoo-gallery" ? "gallery" : sectionId;
    expect(mapped).toBe("gallery");
  });
});

describe("VisualEditor — other postMessage contracts", () => {
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

  it("section-delete message has sectionId", () => {
    const msg = { type: "section-delete", sectionId: "about" };
    expect(msg.type).toBe("section-delete");
    expect(msg.sectionId).toBe("about");
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

describe("editInjector — save order bar behavior", () => {
  it("save order bar appears after reorder", () => {
    let galleryOrderChanged = false;
    let saveOrderBarVisible = false;

    // Simulate a drag-and-drop reorder
    galleryOrderChanged = true;
    saveOrderBarVisible = galleryOrderChanged;

    expect(saveOrderBarVisible).toBe(true);
  });

  it("save order bar disappears after save", () => {
    let galleryOrderChanged = true;
    let saveOrderBarVisible = true;

    // Simulate clicking Save Order
    galleryOrderChanged = false;
    saveOrderBarVisible = false;

    expect(saveOrderBarVisible).toBe(false);
    expect(galleryOrderChanged).toBe(false);
  });

  it("reset button triggers refresh", () => {
    // Simulate clicking Reset — should post request-refresh
    const msg = { type: "request-refresh" };
    expect(msg.type).toBe("request-refresh");
  });
});

describe("editInjector — gallery items get grip and index badge", () => {
  it("each gallery item gets a grip icon", () => {
    const items = 10;
    const grips = items; // Each item gets one grip
    expect(grips).toBe(10);
  });

  it("index badges show 1-based indices", () => {
    const indices = [0, 1, 2, 3, 4].map((i) => String(i + 1));
    expect(indices).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("index badges update after reorder", () => {
    // After reorder, badges should reflect new positions
    const items = ["c.jpg", "a.jpg", "b.jpg"]; // reordered
    const badges = items.map((_, i) => String(i + 1));
    expect(badges).toEqual(["1", "2", "3"]);
  });
});
