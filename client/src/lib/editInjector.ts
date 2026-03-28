/**
 * editInjector.ts
 *
 * Generates a script block injected into the srcdoc iframe for inline editing.
 * All changes communicated to parent via postMessage.
 */

/** CSS injected into the iframe */
const EDIT_CSS = `
body.edit-mode { cursor: default; }
body.edit-mode [data-editable]:hover {
  outline: 2px solid oklch(0.75 0.12 85 / 50%);
  outline-offset: 2px;
  cursor: text;
  border-radius: 3px;
}
body.edit-mode [data-editable].editing {
  outline: 2px solid oklch(0.75 0.12 85);
  outline-offset: 2px;
  background: oklch(0.75 0.12 85 / 8%);
  border-radius: 3px;
}
.ve-img-overlay {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  border-radius: 4px;
  cursor: pointer;
}
body.edit-mode .ve-img-wrapper:hover .ve-img-overlay { display: flex; }
.ve-img-wrapper { position: relative; display: inline-block; }
.ve-img-btn {
  background: oklch(0.75 0.12 85);
  color: #000;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: system-ui, sans-serif;
}
.ve-img-btn:hover { opacity: 0.9; }
body.edit-mode section, body.edit-mode [data-section] { position: relative; }
.ve-section-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  gap: 6px;
  z-index: 1001;
}
body.edit-mode section:hover > .ve-section-controls,
body.edit-mode [data-section]:hover > .ve-section-controls { display: flex; }
.ve-section-btn {
  background: rgba(0,0,0,0.7);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  backdrop-filter: blur(4px);
}
.ve-section-btn:hover { background: rgba(0,0,0,0.85); }
.ve-section-btn.danger { color: #ff6b6b; }
.ve-section-btn.danger:hover { background: rgba(180,0,0,0.7); color: #fff; }
.ve-gallery-add-btn {
  display: none;
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: oklch(0.75 0.12 85);
  color: #000;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  z-index: 1001;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
body.edit-mode .ve-gallery-section:hover .ve-gallery-add-btn { display: block; }
.ve-gallery-del {
  position: absolute;
  top: 4px;
  right: 4px;
  display: none;
  width: 24px;
  height: 24px;
  background: rgba(220,38,38,0.85);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  z-index: 1002;
  align-items: center;
  justify-content: center;
}
body.edit-mode .ve-img-wrapper:hover .ve-gallery-del { display: flex; }
.ve-save-toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: oklch(0.75 0.12 85);
  color: #000;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: system-ui, sans-serif;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: opacity 0.3s;
}
`;

/** JS injected into the iframe */
const EDIT_JS = `
(function() {
  'use strict';

  var activeEl = null;
  var originalText = '';

  function post(msg) {
    window.parent.postMessage(msg, '*');
  }

  /**
   * Extract a section ID from a class name.
   * Matches patterns like "about-section", "booking-cta-section", "gallery-section",
   * "page-hero", "services-section", etc.
   * Returns the section name portion (e.g. "about", "booking-cta", "services")
   * or null if no known pattern is found.
   */
  function extractSectionIdFromClass(cls) {
    if (!cls) return null;

    // Direct class-to-id mappings for well-known patterns
    if (cls.indexOf('gallery-body') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('masonry-grid') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('gallery-section') >= 0) return 'gallery';
    if (cls.indexOf('page-hero') >= 0) return 'hero';

    // Generic pattern: *-section class → extract the part before "-section"
    var secMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-section(?:\\s|$)/i);
    if (secMatch) return secMatch[1];

    // Pattern: *-content, *-area, *-wrapper for top-level containers
    // Only match if it looks like a section name (e.g. "about-content", "services-area")
    var containerMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-(?:content|area|wrapper|block|container)(?:\\s|$)/i);
    if (containerMatch) {
      var name = containerMatch[1];
      // Avoid matching generic layout classes
      if (['main', 'page', 'site', 'app', 'inner', 'outer', 'flex', 'grid'].indexOf(name) < 0) {
        return name;
      }
    }

    return null;
  }

  /**
   * Walk up the DOM tree to find the section ID for an element.
   * Checks: id attribute, data-section attribute, and class-based patterns.
   * Matches the section detection logic in parseHtml.ts.
   */
  function findSectionId(el) {
    var node = el;
    while (node && node !== document.body) {
      // 1. Check id attribute (most reliable)
      if (node.id) return node.id;

      // 2. Check data-section attribute
      if (node.dataset && node.dataset.section) return node.dataset.section;

      // 3. Check class-based patterns on SECTION and DIV elements
      if (node.tagName === 'SECTION' || node.tagName === 'DIV') {
        var cls = node.className || '';
        if (typeof cls === 'string' && cls.length > 0) {
          var extracted = extractSectionIdFromClass(cls);
          if (extracted) return extracted;
        }
      }

      node = node.parentElement;
    }
    return 'unknown';
  }

  /**
   * Build a field key for saving to the Convex API.
   * Keys must match the conventions used in parseHtml.ts:
   *   - hero_title, hero_subtitle, hero_eyebrow, hero_cta_text (hero section)
   *   - about_title, about (bio content), about_photo (about section)
   *   - section_title__[sectionId] (generic section titles)
   *   - [sectionId]__content (generic body content)
   *   - footer_name (footer)
   *   - ig_handle (instagram)
   *   - booking, booking_title, booking_intro (booking section)
   *   - For data-field attributes, use them directly
   */
  function findFieldKey(el) {
    // If the element has an explicit data-field, use it
    if (el.dataset && el.dataset.field) return el.dataset.field;

    var tag = el.tagName.toLowerCase();
    var sectionId = findSectionId(el);
    var cls = el.className || '';

    // ── Hero section: use specific hero_* keys ──
    if (sectionId === 'hero' || sectionId === 'page-hero') {
      if (cls.indexOf('hero-eyebrow') >= 0) return 'hero_eyebrow';
      if (cls.indexOf('hero-title') >= 0 || cls.indexOf('hero-name') >= 0) return 'hero_title';
      if (cls.indexOf('hero-subtitle') >= 0 || cls.indexOf('hero-tagline') >= 0 || cls.indexOf('hero-sub') >= 0) return 'hero_subtitle';
      if (cls.indexOf('hero-cta') >= 0) return 'hero_cta_text';
      if (tag === 'h1') return 'hero_title';
      if (tag === 'h2' || tag === 'h3') return 'hero_subtitle';
      if (tag === 'p') return 'hero_subtitle';
      if (tag === 'a') return 'hero_cta_text';
      return 'hero_title';
    }

    // ── About section: use about_title, about ──
    if (sectionId === 'about' || sectionId === 'nosotros') {
      if (tag === 'h2' || tag === 'h3') return 'about_title';
      if (tag === 'p') return 'about';
      return 'about_title';
    }

    // ── Footer ──
    if (sectionId === 'footer' || (el.closest && el.closest('footer'))) {
      if (cls.indexOf('footer-logo') >= 0) return 'footer_name';
      return 'footer_name';
    }

    // ── Booking section ──
    if (sectionId === 'booking' || sectionId === 'book') {
      if (tag === 'h2') return 'booking_title';
      if (tag === 'p') return 'booking_intro';
      if (tag === 'a') return 'booking';
      return 'booking_title';
    }

    // ── Testimonials section ──
    if (sectionId === 'testimonials') {
      if (cls.indexOf('testimonial-text') >= 0) {
        var cardIndex = getCardIndex(el, 'testimonial-card');
        return 'testimonial__' + cardIndex + '__text';
      }
      if (cls.indexOf('testimonial-author') >= 0) {
        var authorCardIndex = getCardIndex(el, 'testimonial-card');
        return 'testimonial__' + authorCardIndex + '__author';
      }
      if (tag === 'h2') return 'section_title__testimonials';
      if (tag === 'p') return 'section_body__testimonials';
      return 'section_title__testimonials';
    }

    // ── FAQ section ──
    if (sectionId === 'faq') {
      if (cls.indexOf('faq-question') >= 0) return 'faq_question';
      if (cls.indexOf('faq-answer') >= 0) return 'faq_answer';
      if (tag === 'h2') return 'section_title__faq';
      return 'section_title__faq';
    }

    // ── Services section ──
    if (sectionId === 'services') {
      var serviceCardIdx = getCardIndex(el, 'service-card');
      if (serviceCardIdx >= 0) {
        if (tag === 'h3') return 'services__card_title_' + serviceCardIdx;
        if (tag === 'p') return 'services__card_desc_' + serviceCardIdx;
        if (cls.indexOf('service-price') >= 0) return 'service_price_' + serviceCardIdx;
      }
      if (tag === 'h2') return 'section_title__services';
      return 'section_title__services';
    }

    // ── Styles/Specialty section ──
    if (sectionId === 'styles' || sectionId === 'specialty') {
      var styleCardIdx = getCardIndex(el, 'style-card');
      if (styleCardIdx >= 0) {
        if (tag === 'h3') return 'style_card_title_' + styleCardIdx;
        if (tag === 'p') return 'style_card_desc_' + styleCardIdx;
      }
      if (tag === 'h2') return 'styles_title';
      return 'styles_title';
    }

    // ── Shop section ──
    if (sectionId === 'shop') {
      if (tag === 'h2') return 'section_title__shop';
      if (tag === 'p') return 'section_body__shop';
      if (tag === 'a') return 'shop_link';
      return 'section_title__shop';
    }

    // ── Contact ──
    if (sectionId === 'contact') {
      return 'contact_email';
    }

    // ── Instagram ──
    if (sectionId === 'instagram') {
      return 'ig_handle';
    }

    // ── Generic sections: use parseHtml.ts conventions ──
    // section_title__[sectionId] for headings, [sectionId]__content for body text
    if (sectionId && sectionId !== 'unknown') {
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'section_title__' + sectionId;
      if (tag === 'p' || tag === 'blockquote' || tag === 'li') return sectionId + '__content';
      if (tag === 'a') return sectionId + '__link';
      return 'section_title__' + sectionId;
    }

    // ── Fallback for unknown sections ──
    return 'unknown_' + tag;
  }

  /**
   * Find the index of the nearest card ancestor matching a class pattern.
   * Used for testimonial-card, service-card, style-card indexing.
   * Returns -1 if no card ancestor found.
   */
  function getCardIndex(el, cardClass) {
    var card = el.closest ? el.closest('.' + cardClass) : null;
    if (!card || !card.parentElement) return -1;
    var siblings = card.parentElement.querySelectorAll('.' + cardClass);
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i] === card) return i;
    }
    return -1;
  }

  // ── Make text elements editable ──
  function setupEditableText() {
    var selectors = 'h1,h2,h3,h4,h5,h6,p,span.editable,a,li,blockquote,label';
    var els = document.querySelectorAll(selectors);
    els.forEach(function(el) {
      if (!el.textContent.trim()) return;
      if (el.closest('script') || el.closest('style') || el.closest('nav') || el.closest('.ve-section-controls')) return;
      if (el.tagName === 'A' && el.querySelector('img')) return;
      el.setAttribute('data-editable', 'true');

      el.addEventListener('click', function(e) {
        if (!document.body.classList.contains('edit-mode')) return;
        e.preventDefault();
        e.stopPropagation();

        if (activeEl && activeEl !== el) {
          finishEdit(activeEl);
        }

        activeEl = el;
        originalText = el.textContent;
        el.contentEditable = 'true';
        el.classList.add('editing');
        el.focus();
      });

      el.addEventListener('blur', function() {
        if (activeEl === el) {
          finishEdit(el);
        }
      });

      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          el.blur();
        }
        if (e.key === 'Escape') {
          el.textContent = originalText;
          el.blur();
        }
      });
    });
  }

  function finishEdit(el) {
    el.contentEditable = 'false';
    el.classList.remove('editing');
    var newText = el.textContent.trim();
    if (newText !== originalText.trim()) {
      var key = findFieldKey(el);
      var sectionId = findSectionId(el);

      // Don't send edits for elements where we couldn't determine the section
      if (sectionId === 'unknown') {
        showToast('Could not identify section — edit not saved');
        return;
      }

      post({
        type: 'text-edit',
        sectionId: sectionId,
        key: key,
        value: newText,
        originalValue: originalText.trim()
      });
      showToast('Change saved');
    }
    activeEl = null;
    originalText = '';
  }

  // ── Wrap images with swap overlay ──
  function setupImages() {
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img) {
      if (img.closest('.ve-img-wrapper')) return;
      if (img.closest('nav') || img.closest('.ve-section-controls')) return;
      if (img.width < 30 || img.height < 30) return;

      var wrapper = document.createElement('div');
      wrapper.className = 've-img-wrapper';
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      var overlay = document.createElement('div');
      overlay.className = 've-img-overlay';

      var btn = document.createElement('button');
      btn.className = 've-img-btn';
      btn.textContent = 'Change Image';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var sectionId = findSectionId(img);
        var imgKey = img.dataset.field || buildImageKey(img, sectionId);
        post({
          type: 'image-swap',
          sectionId: sectionId,
          currentSrc: img.src,
          key: imgKey
        });
      });

      overlay.appendChild(btn);
      wrapper.appendChild(overlay);

      // Gallery delete button for masonry items
      var isGallery = img.closest('.masonry-item') || img.closest('.gallery-grid') || img.closest('.gallery-item');
      if (isGallery) {
        var delBtn = document.createElement('button');
        delBtn.className = 've-gallery-del';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Remove from gallery';
        delBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          post({
            type: 'gallery-delete',
            sectionId: findSectionId(img),
            filename: img.src.split('/').pop()
          });
        });
        wrapper.appendChild(delBtn);
      }
    });
  }

  /**
   * Build an image field key based on section and context.
   */
  function buildImageKey(img, sectionId) {
    var cls = img.className || '';
    if (cls.indexOf('about-photo') >= 0 || cls.indexOf('about-portrait') >= 0) return 'about_photo';
    if (sectionId === 'hero') return 'hero_bg';
    if (sectionId === 'about') return 'about_photo';
    return sectionId + '_img';
  }

  // ── Gallery "Add Photos" button ──
  function setupGalleries() {
    var galleryEls = document.querySelectorAll(
      '.gallery-grid, .masonry-grid, .gallery-body, [class*="gallery-section"]'
    );
    galleryEls.forEach(function(el) {
      el.classList.add('ve-gallery-section');
      var addBtn = document.createElement('button');
      addBtn.className = 've-gallery-add-btn';
      addBtn.textContent = '+ Add Photos';
      addBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        post({
          type: 'gallery-upload',
          sectionId: findSectionId(el)
        });
      });
      el.style.position = 'relative';
      el.appendChild(addBtn);
    });
  }

  // ── Section controls (delete) ──
  function setupSections() {
    // Select sections with id, data-section, or class-based section patterns
    var sections = document.querySelectorAll('section[id], [data-section], section[class]');
    var processed = new Set();

    sections.forEach(function(sec) {
      // Determine the section ID
      var id = sec.id || (sec.dataset && sec.dataset.section) || '';

      // If no id/data-section, try to extract from class
      if (!id && sec.className) {
        id = extractSectionIdFromClass(sec.className) || '';
      }

      if (!id) return;
      if (processed.has(id)) return;
      processed.add(id);

      // Skip hero and footer — they shouldn't be deletable
      if (id === 'page-hero' || id === 'hero' || id === 'footer') return;

      var controls = document.createElement('div');
      controls.className = 've-section-controls';

      var delBtn = document.createElement('button');
      delBtn.className = 've-section-btn danger';
      delBtn.textContent = 'Delete Section';
      delBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Remove this section from your site? This cannot be undone.')) {
          post({ type: 'section-delete', sectionId: id });
        }
      });
      controls.appendChild(delBtn);
      sec.appendChild(controls);
    });
  }

  // ── Toast ──
  function showToast(msg) {
    var existing = document.querySelector('.ve-save-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 've-save-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 2000);
  }

  // ── Listen for parent messages ──
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'toggle-edit') {
      if (e.data.enabled) {
        document.body.classList.add('edit-mode');
      } else {
        document.body.classList.remove('edit-mode');
        if (activeEl) {
          activeEl.contentEditable = 'false';
          activeEl.classList.remove('editing');
          activeEl = null;
        }
      }
    }
    if (e.data && e.data.type === 'refresh-gallery') {
      // Parent tells us to reload gallery after upload
      post({ type: 'request-refresh' });
    }
  });

  // ── Init ──
  function init() {
    document.body.classList.add('edit-mode');
    setupEditableText();
    setupImages();
    setupGalleries();
    setupSections();
    post({ type: 'editor-ready' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

/**
 * Injects the edit CSS and JS into an HTML string.
 * Also rewrites relative image paths to absolute URLs.
 */
export function injectEditor(html: string, baseUrl: string): string {
  // Inject CSS before </head>
  const cssTag = `<style id="ve-edit-css">${EDIT_CSS}</style>`;
  let result = html;

  if (result.includes("</head>")) {
    result = result.replace("</head>", `${cssTag}\n</head>`);
  } else {
    result = cssTag + result;
  }

  // Rewrite relative image src to absolute
  if (baseUrl) {
    const base = baseUrl.replace(/\/$/, "");
    // Match src="img/..." or src="./img/..." but not src="http" or src="//"
    result = result.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `src="${base}/${cleanPath}"`;
      }
    );
    // Same for background-image: url(...)
    result = result.replace(
      /url\(["']?(?!https?:\/\/)(?!\/\/)(?!data:)([^"')]+)["']?\)/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `url("${base}/${cleanPath}")`;
      }
    );
  }

  // Inject JS before </body>
  const jsTag = `<script id="ve-edit-js">${EDIT_JS}</script>`;
  if (result.includes("</body>")) {
    result = result.replace("</body>", `${jsTag}\n</body>`);
  } else {
    result += jsTag;
  }

  return result;
}
