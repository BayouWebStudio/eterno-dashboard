// Debug script: test parseGalleryImages against real tattoos.html content
// We'll simulate what the browser sees

const TATTOOS_HTML_SAMPLE = `
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
`;

// Simulate parseGalleryImages with sectionId = "tattoo-gallery"
function parseGalleryImages(html, sectionId = "gallery") {
  console.log(`\n--- Testing with sectionId: "${sectionId}" ---`);
  
  // Try standard section-based gallery first
  const secMatch = html.match(new RegExp(`<section[^>]+(?:id="${sectionId}"|class="[^"]*gallery-section[^"]*")[^>]*>([\\s\\S]*?)<\\/section>`, "i"));
  console.log("Standard section match:", secMatch ? "FOUND" : "NOT FOUND");
  if (secMatch) {
    const imgs = Array.from(secMatch[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
    console.log("Images from section:", imgs.length);
    return imgs.map((m) => m[1]);
  }

  // Fallback: masonry-grid
  const masonryMatch =
    html.match(/<div[^>]*class="[^"]*masonry[_-]?grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    html.match(/<div[^>]*class="[^"]*gallery[_-]?body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<section)/i);
  console.log("Masonry match:", masonryMatch ? "FOUND" : "NOT FOUND");
  if (masonryMatch) {
    console.log("Matched content length:", masonryMatch[1].length);
    console.log("Matched content preview:", masonryMatch[1].substring(0, 200));
    const imgs = Array.from(masonryMatch[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
    console.log("Images from masonry:", imgs.length);
    if (imgs.length > 0) return imgs.map((m) => m[1]);
  }

  // Last resort: masonry-item
  const masonryItems = Array.from(html.matchAll(/<div[^>]*class="[^"]*masonry-item[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>/gi));
  console.log("Masonry-item fallback:", masonryItems.length, "images");
  if (masonryItems.length > 0) return masonryItems.map((m) => m[1]);

  return [];
}

// Test with different sectionIds
const result1 = parseGalleryImages(TATTOOS_HTML_SAMPLE, "tattoo-gallery");
console.log("Result with tattoo-gallery:", result1);

const result2 = parseGalleryImages(TATTOOS_HTML_SAMPLE, "gallery");
console.log("Result with gallery:", result2);

const result3 = parseGalleryImages(TATTOOS_HTML_SAMPLE);
console.log("Result with default:", result3);

// Now test with escaped HTML (as it would come from JSON API response)
const ESCAPED = TATTOOS_HTML_SAMPLE.replace(/"/g, '\\"').replace(/\n/g, '\\n');
console.log("\n--- Testing with escaped HTML ---");
// The actual API returns the HTML as a string value in JSON, which gets parsed back
// So the HTML should be unescaped when it reaches parseGalleryImages
// The issue might be that the masonry-grid regex's </div>\s*</div> is too greedy or not matching
// because the actual HTML has nested divs

// Test the regex patterns directly
console.log("\n--- Direct regex tests ---");
const r1 = /<div[^>]*class="[^"]*masonry[_-]?grid[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i;
console.log("masonry-grid regex test:", r1.test(TATTOOS_HTML_SAMPLE));

const r2 = /<div[^>]*class="[^"]*masonry-item[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*>/gi;
const items = Array.from(TATTOOS_HTML_SAMPLE.matchAll(r2));
console.log("masonry-item regex matches:", items.length);
items.forEach((m, i) => console.log(`  ${i}: ${m[1]}`));
