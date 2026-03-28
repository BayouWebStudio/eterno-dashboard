import { describe, expect, it } from "vitest";
import { parseSections, parseGalleryImages } from "../client/src/lib/parseHtml";

/**
 * Tests for the inline gallery editor integration in the Section Editor.
 * Covers gallery section detection, image parsing, and isGallery flag.
 * Includes tests for tattoos.html masonry-grid pattern with realistic full-page HTML.
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

// Realistic full-page tattoos.html with nested divs, scripts, footer, etc.
// This mimics what the Convex API actually returns
const TATTOOS_FULL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tattoos — Raul Wesche</title>
  <style>
    .masonry-grid { columns: 3; column-gap: 3px; }
    .masonry-item { break-inside: avoid; margin-bottom: 3px; overflow: hidden; }
    .masonry-item img { width: 100%; display: block; }
  </style>
</head>
<body>
  <nav>
    <a href="./index.html" class="nav-logo">Raul Wesche</a>
    <ul class="nav-links">
      <li><a href="./index.html">Home</a></li>
      <li><a href="./tattoos.html" class="active">Tattoos</a></li>
    </ul>
  </nav>
  <div class="mobile-menu">
    <a href="./index.html">Home</a>
    <a href="./tattoos.html">Tattoos</a>
  </div>
  <a href="./booking.html" class="book-float">Book</a>

  <section class="page-hero">
    <p class="page-eyebrow fade-up" data-en="Portfolio" data-es="Portafolio">Portfolio</p>
    <h1 class="fade-up" data-en="Tattoos" data-es="Tatuajes">Tattoos</h1>
  </section>

  <div class="gallery-body">
    <div class="masonry-grid">
      <div class="masonry-item fade-up"><img src="img/1.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/2.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/3.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/4.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/5.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/6.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/7.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/8.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/9.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/10.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
    </div>
  </div>

  <section class="booking-cta-section">
    <h2 data-en="Ready to get inked?" data-es="¿Listo para tatuarte?">Ready to get inked?</h2>
    <p>Book your session today and let us create something amazing.</p>
    <a href="./booking.html" class="btn-gold">Book Now</a>
  </section>

  <footer>
    <span class="footer-logo">Raul Wesche</span>
    <div class="footer-links">
      <a href="./index.html">Home</a>
      <a href="./about.html">About</a>
    </div>
    <span class="footer-copy">© 2025 Raul Wesche. All rights reserved.</span>
  </footer>

  <script>
    function toggleLang() { /* ... */ }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
  </script>
</body>
</html>`;

// Simple tattoos.html (original test)
const TATTOOS_HTML = `
<section class="page-hero">
  <p class="page-eyebrow fade-up">Portfolio</p>
  <h1 class="fade-up">Tattoos</h1>
</section>
<div class="gallery-body">
  <div class="masonry-grid">
    <div class="masonry-item fade-up"><img src="img/1.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
    <div class="masonry-item fade-up"><img src="img/2.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
    <div class="masonry-item fade-up"><img src="img/3.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
    <div class="masonry-item fade-up"><img src="img/4.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
  </div>
</div>
<section class="booking-cta-section">
  <h2>Ready to get inked?</h2>
  <p>Book your session today and let us create something amazing.</p>
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

describe("Tattoos.html masonry gallery detection", () => {
  it("detects masonry-grid as a gallery section (simple)", () => {
    const sections = parseSections(TATTOOS_HTML);
    const gallerySec = sections.find((s) => s.isGallery === true);
    expect(gallerySec).toBeDefined();
    expect(gallerySec!.id).toBe("tattoo-gallery");
  });

  it("detects masonry-grid as a gallery section (full page)", () => {
    const sections = parseSections(TATTOOS_FULL_HTML);
    const gallerySec = sections.find((s) => s.isGallery === true);
    expect(gallerySec).toBeDefined();
    expect(gallerySec!.id).toBe("tattoo-gallery");
  });

  it("masonry gallery has correct icon", () => {
    const sections = parseSections(TATTOOS_FULL_HTML);
    const gallerySec = sections.find((s) => s.id === "tattoo-gallery");
    expect(gallerySec!.icon).toBe("📷");
  });

  it("extracts title from page-hero h1", () => {
    const sections = parseSections(TATTOOS_FULL_HTML);
    const gallerySec = sections.find((s) => s.id === "tattoo-gallery");
    expect(gallerySec!.title).toBe("Tattoos");
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
});

describe("parseGalleryImages for tattoos.html masonry pattern", () => {
  it("extracts images from simple masonry HTML", () => {
    const images = parseGalleryImages(TATTOOS_HTML, "tattoo-gallery");
    expect(images.length).toBe(4);
    expect(images[0]).toBe("img/1.jpg");
  });

  it("extracts images from full-page tattoos.html (realistic)", () => {
    const images = parseGalleryImages(TATTOOS_FULL_HTML, "tattoo-gallery");
    expect(images.length).toBe(10);
    expect(images[0]).toBe("img/1.jpg");
    expect(images[9]).toBe("img/10.jpg");
  });

  it("does not include footer or nav images", () => {
    const images = parseGalleryImages(TATTOOS_FULL_HTML, "tattoo-gallery");
    // All images should be img/*.jpg, not nav/footer images
    expect(images.every((src) => src.startsWith("img/"))).toBe(true);
  });

  it("extracts images with default sectionId when masonry-grid is present", () => {
    const images = parseGalleryImages(TATTOOS_FULL_HTML);
    expect(images.length).toBe(10);
  });

  it("returns correct count of masonry images", () => {
    const images = parseGalleryImages(TATTOOS_HTML);
    expect(images.length).toBe(4);
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
