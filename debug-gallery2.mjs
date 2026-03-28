// Debug: test with more realistic HTML that has the full tattoos page structure
// The actual HTML has many more masonry items and nested divs

const REAL_TATTOOS_HTML = `<html><head><style>
    .masonry-grid { columns: 3; column-gap: 3px; }
    .masonry-item { break-inside: avoid; margin-bottom: 3px; overflow: hidden; }
  </style></head><body>
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
        <div class="masonry-item fade-up"><img src="img/5.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/6.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/7.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/8.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/9.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
        <div class="masonry-item fade-up"><img src="img/10.jpg" alt="Raul Wesche tattoo" loading="lazy"></div>
    </div>
  </div>
  <section class="booking-cta-section">
    <h2>Ready to get inked?</h2>
    <p>Book your session today.</p>
  </section>
</body></html>`;

// Test approach 1: masonry-grid regex (current)
const r1 = /<div[^>]*class="[^"]*masonry[_-]?grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i;
const m1 = REAL_TATTOOS_HTML.match(r1);
console.log("Approach 1 (masonry-grid lazy):");
if (m1) {
  const imgs = Array.from(m1[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
  console.log("  Images found:", imgs.length);
  imgs.forEach((m, i) => console.log(`    ${i}: ${m[1]}`));
} else {
  console.log("  NO MATCH");
}

// Test approach 2: masonry-item fallback (current)
const r2 = /<div[^>]*class="[^"]*masonry-item[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>/gi;
const items = Array.from(REAL_TATTOOS_HTML.matchAll(r2));
console.log("\nApproach 2 (masonry-item fallback):");
console.log("  Images found:", items.length);
items.forEach((m, i) => console.log(`    ${i}: ${m[1]}`));

// Test approach 3: greedy masonry-grid
const r3 = /<div[^>]*class="[^"]*masonry[_-]?grid[^"]*"[^>]*>([\s\S]*)<\/div>\s*<\/div>/i;
const m3 = REAL_TATTOOS_HTML.match(r3);
console.log("\nApproach 3 (masonry-grid greedy):");
if (m3) {
  const imgs = Array.from(m3[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
  console.log("  Images found:", imgs.length);
} else {
  console.log("  NO MATCH");
}

// Test approach 4: gallery-body content
const r4 = /<div[^>]*class="[^"]*gallery[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<section)/i;
const m4 = REAL_TATTOOS_HTML.match(r4);
console.log("\nApproach 4 (gallery-body):");
if (m4) {
  const imgs = Array.from(m4[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
  console.log("  Images found:", imgs.length);
} else {
  console.log("  NO MATCH");
}
