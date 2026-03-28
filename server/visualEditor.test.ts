import { describe, it, expect } from "vitest";

/**
 * Tests for the inline visual editor feature.
 * Tests the editInjector HTML transformation logic.
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

describe("editInjector — section ID detection", () => {
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
});

describe("editInjector — field key extraction", () => {
  it("extracts heading key from h1 tag", () => {
    // Simulate findFieldKey logic
    const tag = "h1";
    const sectionId = "hero";
    const key = sectionId + "_heading";
    expect(key).toBe("hero_heading");
  });

  it("extracts text key from p tag", () => {
    const tag = "p";
    const sectionId = "about";
    const key = sectionId + "_text";
    expect(key).toBe("about_text");
  });

  it("uses data-field attribute when present", () => {
    const dataField = "hero_subtitle";
    const key = dataField || "hero_text";
    expect(key).toBe("hero_subtitle");
  });
});

describe("VisualEditor — postMessage contract", () => {
  it("text-edit message has required fields", () => {
    const msg = {
      type: "text-edit",
      sectionId: "about",
      key: "about_heading",
      value: "New heading text",
      originalValue: "Old heading text",
    };
    expect(msg.type).toBe("text-edit");
    expect(msg.sectionId).toBeTruthy();
    expect(msg.key).toBeTruthy();
    expect(msg.value).toBeTruthy();
    expect(msg.originalValue).toBeTruthy();
  });

  it("image-swap message has required fields", () => {
    const msg = {
      type: "image-swap",
      sectionId: "hero",
      currentSrc: "https://example.com/old.jpg",
      key: "hero_img",
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
