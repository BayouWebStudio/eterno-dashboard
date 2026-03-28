import { describe, expect, it } from "vitest";
import { parseSections, parseGalleryImages } from "../client/src/lib/parseHtml";

/**
 * Tests for the inline gallery editor integration in the Section Editor.
 * Covers gallery section detection, image parsing, and isGallery flag.
 */

const GALLERY_HTML = `
<section id="gallery" class="gallery-section">
  <h2 class="section-title">Our Work</h2>
  <div class="gallery__grid">
    <img src="img/tattoo1.jpg" alt="Tattoo 1" />
    <img src="img/tattoo2.jpg" alt="Tattoo 2" />
    <img src="img/tattoo3.jpg" alt="Tattoo 3" />
  </div>
</section>
`;

const GALLERY_WITH_OTHER_SECTIONS = `
<section id="hero">
  <h1 class="hero-title">Artist Name</h1>
</section>
<section id="gallery" class="gallery-section">
  <h2 class="section-title">Gallery</h2>
  <div class="gallery__grid">
    <img src="img/pic1.jpg" alt="Pic 1" />
    <img src="img/pic2.jpg" alt="Pic 2" />
  </div>
</section>
<section id="about">
  <h2>About</h2>
  <p>Some bio text that is long enough to be parsed.</p>
</section>
`;

const NO_GALLERY_HTML = `
<section id="hero">
  <h1 class="hero-title">Artist Name</h1>
</section>
<section id="about">
  <h2>About</h2>
  <p>Some bio text that is long enough to be parsed.</p>
</section>
`;

describe("Gallery section detection in parseSections", () => {
  it("detects gallery section with isGallery flag", () => {
    const sections = parseSections(GALLERY_HTML);
    const gallerySec = sections.find((s) => s.id === "gallery");
    expect(gallerySec).toBeDefined();
    expect(gallerySec!.isGallery).toBe(true);
  });

  it("gallery section has correct icon", () => {
    const sections = parseSections(GALLERY_HTML);
    const gallerySec = sections.find((s) => s.id === "gallery");
    expect(gallerySec!.icon).toBe("📷");
  });

  it("gallery section is included alongside other sections", () => {
    const sections = parseSections(GALLERY_WITH_OTHER_SECTIONS);
    const gallerySection = sections.find((s) => s.id === "gallery");
    const heroSection = sections.find((s) => s.id === "hero");
    expect(gallerySection).toBeDefined();
    expect(heroSection).toBeDefined();
    expect(gallerySection!.isGallery).toBe(true);
  });

  it("non-gallery sections do not have isGallery flag", () => {
    const sections = parseSections(GALLERY_WITH_OTHER_SECTIONS);
    const heroSection = sections.find((s) => s.id === "hero");
    expect(heroSection!.isGallery).toBeUndefined();
  });

  it("returns no gallery section when HTML has no gallery", () => {
    const sections = parseSections(NO_GALLERY_HTML);
    const gallerySec = sections.find((s) => s.isGallery === true);
    expect(gallerySec).toBeUndefined();
  });
});

describe("parseGalleryImages", () => {
  it("extracts image URLs from gallery section", () => {
    const images = parseGalleryImages(GALLERY_HTML);
    expect(images).toEqual(["img/tattoo1.jpg", "img/tattoo2.jpg", "img/tattoo3.jpg"]);
  });

  it("extracts images from gallery section by ID", () => {
    const images = parseGalleryImages(GALLERY_WITH_OTHER_SECTIONS, "gallery");
    expect(images).toEqual(["img/pic1.jpg", "img/pic2.jpg"]);
  });

  it("returns empty array when no gallery section exists", () => {
    const images = parseGalleryImages(NO_GALLERY_HTML);
    expect(images).toEqual([]);
  });

  it("returns empty array for non-existent section ID in HTML without gallery class", () => {
    const images = parseGalleryImages(NO_GALLERY_HTML, "nonexistent");
    expect(images).toEqual([]);
  });

  it("falls back to gallery-section class when ID does not match", () => {
    // parseGalleryImages regex also matches class="gallery-section"
    const images = parseGalleryImages(GALLERY_HTML, "nonexistent");
    expect(images.length).toBeGreaterThan(0);
  });
});

describe("Gallery image save format", () => {
  it("serializes image array to JSON for saveSiteField", () => {
    const images = ["img/tattoo1.jpg", "img/tattoo2.jpg", "img/tattoo3.jpg"];
    const serialized = JSON.stringify(images);
    expect(serialized).toBe('["img/tattoo1.jpg","img/tattoo2.jpg","img/tattoo3.jpg"]');
  });

  it("handles empty gallery", () => {
    const images: string[] = [];
    const serialized = JSON.stringify(images);
    expect(serialized).toBe("[]");
  });

  it("preserves order after reorder", () => {
    const images = ["img/a.jpg", "img/b.jpg", "img/c.jpg"];
    // Simulate drag: move index 2 to index 0
    const next = [...images];
    const [moved] = next.splice(2, 1);
    next.splice(0, 0, moved);
    expect(next).toEqual(["img/c.jpg", "img/a.jpg", "img/b.jpg"]);
  });

  it("handles delete correctly", () => {
    const images = ["img/a.jpg", "img/b.jpg", "img/c.jpg"];
    const afterDelete = images.filter((_, i) => i !== 1);
    expect(afterDelete).toEqual(["img/a.jpg", "img/c.jpg"]);
  });

  it("handles upload (append) correctly", () => {
    const images = ["img/a.jpg", "img/b.jpg"];
    const newImages = [...images, "img/new.jpg"];
    expect(newImages).toEqual(["img/a.jpg", "img/b.jpg", "img/new.jpg"]);
  });
});
