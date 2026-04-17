/**
 * editInjector.ts
 *
 * Generates a script block injected into the srcdoc iframe for inline editing.
 * All changes communicated to parent via postMessage.
 */

/** CSS injected into the iframe */
const EDIT_CSS = `
body.edit-mode { cursor: default; }
/* Force scroll-reveal elements visible — the JS that triggers them is stripped for security */
.fade-up, .reveal, .scroll-reveal, .animate-on-scroll, [data-aos] {
  opacity: 1 !important;
  transform: none !important;
  transition: none !important;
}
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
body.edit-mode [data-ve-pending] {
  outline: 2px dashed oklch(0.75 0.12 85 / 60%);
  outline-offset: 2px;
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
  top: 48px;
  right: 12px;
  background: oklch(0.75 0.12 85);
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.ve-gallery-add-btn:hover { background: oklch(0.80 0.14 85); transform: scale(1.04); }
body.edit-mode .ve-gallery-add-btn { display: block; }
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
/* ── Drag-and-drop gallery reorder ── */
body.edit-mode .ve-gallery-item {
  cursor: grab;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
body.edit-mode .ve-gallery-item:active { cursor: grabbing; }
body.edit-mode .ve-gallery-item.ve-dragging {
  opacity: 0.4;
  transform: scale(0.95);
}
body.edit-mode .ve-gallery-item.ve-drag-over {
  outline: 2px solid oklch(0.75 0.12 85);
  outline-offset: 2px;
}
.ve-gallery-grip {
  position: absolute;
  top: 4px;
  left: 4px;
  display: none;
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  z-index: 1002;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
body.edit-mode .ve-gallery-item:hover .ve-gallery-grip { display: flex; }
.ve-save-order-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0,0,0,0.85);
  border: 1px solid oklch(0.75 0.12 85 / 40%);
  padding: 10px 20px;
  border-radius: 12px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  font-family: system-ui, sans-serif;
}
.ve-save-order-bar span {
  color: oklch(0.75 0.12 85);
  font-size: 13px;
  font-weight: 500;
}
.ve-save-order-btn {
  background: oklch(0.75 0.12 85);
  color: #000;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: system-ui, sans-serif;
}
.ve-save-order-btn:hover { opacity: 0.9; }
.ve-save-order-btn.cancel {
  background: transparent;
  color: #aaa;
  border: 1px solid rgba(255,255,255,0.2);
  font-weight: 500;
}
.ve-save-order-btn.cancel:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
.ve-gallery-idx {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: none;
  padding: 2px 6px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: system-ui, monospace;
  z-index: 1002;
  pointer-events: none;
}
body.edit-mode .ve-gallery-item:hover .ve-gallery-idx { display: block; }
`;

/** JS injected into the iframe */
const EDIT_JS = `
(function() {
  'use strict';

  var activeEl = null;
  var galleryOrderChanged = false;
  var originalGalleryOrder = [];
  var saveOrderBar = null;

  function post(msg) {
    // srcdoc iframes have origin "null" and can't know the parent's origin,
    // so we must use '*'. The parent validates via its own origin check.
    window.parent.postMessage(msg, '*');
  }

  /**
   * Extract filename from an image src.
   * "img/1.jpg" -> "1.jpg"
   * "https://cdn.example.com/img/tattoo-3.jpg?v=123" -> "tattoo-3.jpg"
   */
  function extractFilename(src) {
    var clean = src.split('?')[0];
    var parts = clean.split('/');
    return parts[parts.length - 1] || src;
  }

  /**
   * Extract a section ID from a class name.
   */
  function extractSectionIdFromClass(cls) {
    if (!cls) return null;
    if (cls.indexOf('gallery-body') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('masonry-grid') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('gallery-section') >= 0) return 'gallery';
    if (cls.indexOf('gallery-grid') >= 0) return 'gallery';
    if (cls.indexOf('page-hero') >= 0) return 'page-hero';
    if (cls.indexOf('booking-cta') >= 0) return 'booking-cta';

    var secMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-section(?:\\s|$)/i);
    if (secMatch) return secMatch[1];

    // Match container patterns but handle BEM double-dash (e.g. gallery-grid--preview → gallery-grid)
    var containerMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-(?:content|area|wrapper|block|container|preview|grid|body)(?:--[a-z]+)?(?:\\s|$)/i);
    if (containerMatch) {
      var name = containerMatch[1].replace(/-+$/, '');
      if (['main', 'page', 'site', 'app', 'inner', 'outer', 'flex', 'grid'].indexOf(name) < 0) {
        return name;
      }
    }

    // Bare well-known section class names (e.g. class="hero", class="about", class="gallery")
    var knownSections = ['hero', 'about', 'gallery', 'booking', 'contact', 'faq', 'testimonials', 'services', 'portfolio', 'reviews', 'pricing'];
    var classes = cls.split(/\\s+/);
    for (var ki = 0; ki < knownSections.length; ki++) {
      if (classes.indexOf(knownSections[ki]) >= 0) return knownSections[ki];
    }
    return null;
  }

  /**
   * Walk up the DOM tree to find the section ID for an element.
   */
  function findSectionId(el) {
    var node = el;
    while (node && node !== document.body) {
      // Skip injected editor elements (ve-img-wrapper, ve-section-controls, etc.)
      var nodeCls = node.className || '';
      if (typeof nodeCls === 'string' && nodeCls.indexOf('ve-') === 0) {
        node = node.parentElement;
        continue;
      }

      if (node.id) return node.id;
      if (node.dataset && node.dataset.section) return node.dataset.section;
      if (node.tagName === 'SECTION' || node.tagName === 'DIV') {
        var cls = nodeCls;
        if (typeof cls === 'string' && cls.length > 0) {
          var extracted = extractSectionIdFromClass(cls);
          if (extracted) return extracted;
        }
        // Fallback for generic class="section" or unnamed sections:
        // Derive ID from the section's first heading text or use positional index
        if (node.tagName === 'SECTION') {
          var heading = node.querySelector('h1, h2, h3');
          if (heading) {
            var headingText = (heading.textContent || '').trim().toLowerCase()
              .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
            if (headingText.length > 2) return headingText;
          }
          // Last resort: use section index
          var allSections = document.querySelectorAll('section');
          for (var si = 0; si < allSections.length; si++) {
            if (allSections[si] === node) return 'section-' + si;
          }
        }
      }
      node = node.parentElement;
    }
    return 'unknown';
  }

  /**
   * Build a field key for saving to the Convex API.
   */
  function findFieldKey(el) {
    if (el.dataset && el.dataset.field) return el.dataset.field;

    // Special case: nav logo and footer logo — these are outside sections
    var cls0 = el.className || '';
    if (cls0.indexOf('nav-logo') >= 0) return 'nav_logo';
    if (cls0.indexOf('footer-logo') >= 0) return 'footer_name';

    var tag = el.tagName.toLowerCase();
    var sectionId = findSectionId(el);
    var cls = el.className || '';

    if (sectionId === 'hero' || sectionId === 'page-hero') {
      if (cls.indexOf('section-label') >= 0) return 'section_label__' + sectionId;
      if (cls.indexOf('hero-eyebrow') >= 0) return 'hero_eyebrow';
      if (cls.indexOf('hero-title') >= 0 || cls.indexOf('hero-name') >= 0) return 'hero_title';
      if (cls.indexOf('hero-subtitle') >= 0 || cls.indexOf('hero-tagline') >= 0 || cls.indexOf('hero-sub') >= 0) return 'hero_subtitle';
      if (cls.indexOf('hero-cta') >= 0) return 'hero_cta_text';
      if (tag === 'h1') return sectionId === 'page-hero' ? 'section_title__' + sectionId : 'hero_title';
      if (tag === 'h2' || tag === 'h3') return 'hero_subtitle';
      if (tag === 'p') return sectionId === 'page-hero' ? 'section_label__' + sectionId : 'hero_subtitle';
      if (tag === 'a') return 'hero_cta_text';
      return sectionId === 'page-hero' ? 'section_title__' + sectionId : 'hero_title';
    }

    if (sectionId === 'about' || sectionId === 'nosotros') {
      if (cls.indexOf('stat-num') >= 0) {
        var numIdx = getStatIndex(el, 'stat-num');
        if (numIdx >= 0) return 'about_stat_number_' + numIdx;
      }
      if (cls.indexOf('stat-label') >= 0) {
        var lblIdx = getStatIndex(el, 'stat-label');
        if (lblIdx >= 0) return 'about_stat_label_' + lblIdx;
      }
      if (cls.indexOf('stat-number') >= 0) {
        var snIdx = getStatIndex(el, 'stat-number');
        if (snIdx >= 0) return 'about_stat_number_' + snIdx;
      }
      if (tag === 'h2' || tag === 'h3') return 'about_title';
      if (tag === 'p') return 'about';
      return 'about_title';
    }

    if (sectionId === 'footer' || (el.closest && el.closest('footer'))) {
      if (cls.indexOf('footer-logo') >= 0) return 'footer_name';
      return 'footer_name';
    }

    if (sectionId === 'booking' || sectionId === 'book') {
      if (tag === 'h2') return 'booking_title';
      if (tag === 'p') return 'booking_intro';
      if (tag === 'a') return 'booking';
      return 'booking_title';
    }

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

    if (sectionId === 'faq') {
      if (cls.indexOf('faq-question') >= 0) return 'faq_question';
      if (cls.indexOf('faq-answer') >= 0) return 'faq_answer';
      if (tag === 'h2') return 'section_title__faq';
      return 'section_title__faq';
    }

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

    if (sectionId === 'styles' || sectionId === 'specialty') {
      var styleCardIdx = getCardIndex(el, 'style-card');
      if (styleCardIdx >= 0) {
        if (tag === 'h3') return 'style_card_title_' + styleCardIdx;
        if (tag === 'p') return 'style_card_desc_' + styleCardIdx;
      }
      if (tag === 'h2') return 'styles_title';
      return 'styles_title';
    }

    if (sectionId === 'shop') {
      if (tag === 'h2') return 'section_title__shop';
      if (tag === 'p') return 'section_body__shop';
      if (tag === 'a') return 'shop_link';
      return 'section_title__shop';
    }

    if (sectionId === 'contact') return 'contact_email';
    if (sectionId === 'instagram') return 'ig_handle';

    if (sectionId && sectionId !== 'unknown') {
      // Check section-label class before tag-based fallback
      if (cls.indexOf('section-label') >= 0) return 'section_label__' + sectionId;
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'section_title__' + sectionId;
      if (tag === 'p' || tag === 'blockquote' || tag === 'li') return sectionId + '__content';
      if (tag === 'a') return sectionId + '__link';
      return 'section_title__' + sectionId;
    }

    return 'unknown_' + tag;
  }

  function getStatIndex(el, statClass) {
    // Find all elements with the same stat class within the about section
    var section = el.closest ? el.closest('section') : null;
    if (!section) return -1;
    var all = section.querySelectorAll('.' + statClass);
    for (var i = 0; i < all.length; i++) {
      if (all[i] === el) return i;
    }
    return -1;
  }

  function getCardIndex(el, cardClass) {
    var card = el.closest ? el.closest('.' + cardClass) : null;
    if (!card || !card.parentElement) return -1;
    var siblings = card.parentElement.querySelectorAll('.' + cardClass);
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i] === card) return i;
    }
    return -1;
  }

  // ── Check if an element is inside a gallery container ──
  function isGalleryImage(el) {
    return !!(
      el.closest('.masonry-item') ||
      el.closest('.gallery-item') ||
      el.closest('.gallery-grid') ||
      el.closest('.masonry-grid') ||
      el.closest('.gallery-body')
    );
  }

  // ── Make text elements editable ──
  function setupEditableText() {
    var selectors = 'h1,h2,h3,h4,h5,h6,p,span,div,a,li,blockquote,label';
    var els = document.querySelectorAll(selectors);
    els.forEach(function(el) {
      if (!el.textContent.trim()) return;
      if (el.closest('script') || el.closest('style') || el.closest('.ve-section-controls')) return;
      // Skip nav elements EXCEPT the logo (which should be editable)
      if (el.closest('nav') && !el.classList.contains('nav-logo') && !el.classList.contains('footer-logo')) return;
      if (el.tagName === 'A' && el.querySelector('img')) return;
      // Skip structural containers (span/div with child elements are layout wrappers, not text nodes)
      if ((el.tagName === 'SPAN' || el.tagName === 'DIV') && el.children.length > 0) return;
      el.setAttribute('data-editable', 'true');

      el.addEventListener('click', function(e) {
        if (!document.body.classList.contains('edit-mode')) return;
        e.preventDefault();
        e.stopPropagation();

        activeEl = el;
        // Store original text on first edit — don't overwrite if re-editing
        if (!el.dataset.veOriginal) {
          el.dataset.veOriginal = el.textContent;
        }
        el.contentEditable = 'true';
        el.classList.add('editing');
        el.focus();
      });

      el.addEventListener('blur', function() {
        el.contentEditable = 'false';
        el.classList.remove('editing');
        // Mark as pending if text changed from original
        var orig = el.dataset.veOriginal;
        if (orig !== undefined && el.textContent.trim() !== orig.trim()) {
          el.dataset.vePending = 'true';
        } else if (orig !== undefined) {
          // Text was reverted to original — remove pending marker
          delete el.dataset.vePending;
        }
        if (activeEl === el) activeEl = null;
      });

      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
        }
        if (e.key === 'Escape') {
          // Revert this element only
          if (el.dataset.veOriginal) {
            el.textContent = el.dataset.veOriginal;
            delete el.dataset.veOriginal;
            delete el.dataset.vePending;
          }
          el.contentEditable = 'false';
          el.classList.remove('editing');
          if (activeEl === el) activeEl = null;
        }
      });
    });
  }

  /** Save all pending edits and the active edit (called by Save button). */
  function saveAllPending() {
    // Close the active edit first so it gets marked as pending
    if (activeEl) {
      activeEl.contentEditable = 'false';
      activeEl.classList.remove('editing');
      var orig = activeEl.dataset.veOriginal;
      if (orig !== undefined && activeEl.textContent.trim() !== orig.trim()) {
        activeEl.dataset.vePending = 'true';
      }
      activeEl = null;
    }

    var pending = document.querySelectorAll('[data-ve-pending]');
    if (pending.length === 0) {
      showToast('No changes to save');
      return;
    }

    // Collect all edits into a single batch message so the parent
    // can save them sequentially (avoids GitHub SHA conflicts).
    var edits = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      var origText = el.dataset.veOriginal || '';
      var newText = el.textContent.trim();
      if (newText === origText.trim()) continue;

      var key = findFieldKey(el);
      var sectionId = findSectionId(el);
      var globalKeys = ['nav_logo', 'footer_name'];
      if (sectionId === 'unknown' && globalKeys.indexOf(key) < 0) continue;

      edits.push({
        sectionId: sectionId,
        key: key,
        value: newText,
        originalValue: origText.trim()
      });
      // Clean up — this is now the new baseline
      delete el.dataset.veOriginal;
      delete el.dataset.vePending;
    }

    if (edits.length === 0) {
      showToast('No changes to save');
      return;
    }

    post({ type: 'batch-text-edit', edits: edits });
    showToast(edits.length + ' change' + (edits.length !== 1 ? 's' : '') + ' saving...');
  }

  /** Revert all pending edits (called when switching to Preview). */
  function revertAllPending() {
    var pending = document.querySelectorAll('[data-ve-original]');
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      el.textContent = el.dataset.veOriginal;
      delete el.dataset.veOriginal;
      delete el.dataset.vePending;
      el.contentEditable = 'false';
      el.classList.remove('editing');
    }
    activeEl = null;
  }

  // ── Wrap images with swap overlay ──
  function setupImages() {
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img) {
      if (img.closest('.ve-img-wrapper')) return;
      if (img.closest('nav') || img.closest('.ve-section-controls')) return;

      // For gallery images, always process them (don't skip by size)
      // For non-gallery images, skip tiny ones (icons, spacers)
      var inGallery = isGalleryImage(img);
      if (!inGallery) {
        // Check loaded dimensions, or fall back to attributes
        var w = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0', 10);
        var h = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0', 10);
        if (w > 0 && w < 30 && h > 0 && h < 30) return;
      }

      var wrapper = document.createElement('div');
      wrapper.className = 've-img-wrapper';
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      // Gallery images use delete + upload, not individual swap
      if (!inGallery) {
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
      }

      // Gallery delete button — add to ALL gallery images
      if (inGallery) {
        var delBtn = document.createElement('button');
        delBtn.className = 've-gallery-del';
        delBtn.innerHTML = '\\u00D7';
        delBtn.title = 'Remove from gallery';
        delBtn.addEventListener('mousedown', function(e) {
          e.stopPropagation();
        });
        delBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          post({
            type: 'gallery-delete',
            sectionId: findSectionId(img),
            filename: extractFilename(img.src)
          });
        });
        wrapper.appendChild(delBtn);
      }
    });
  }

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
      // Skip if this element or an ancestor already has the gallery button
      if (el.querySelector('.ve-gallery-add-btn') || el.closest('.ve-gallery-section')) return;
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

  // ── Drag-and-drop gallery reorder ──
  function setupGalleryDragDrop() {
    // Find all gallery containers (masonry-grid, gallery-grid, gallery-body)
    var containers = document.querySelectorAll('.masonry-grid, .gallery-grid, .gallery-body');
    containers.forEach(function(container) {
      // Find the draggable items inside
      var items = container.querySelectorAll('.masonry-item, .gallery-item, .gallery-grid > div, .gallery-grid > a');
      if (items.length === 0) return;

      // Record original order
      var sectionId = findSectionId(container);
      var origOrder = [];
      items.forEach(function(item) {
        var img = item.querySelector('img') || item;
        if (img.tagName === 'IMG' && img.src) {
          origOrder.push(extractFilename(img.src));
        }
      });
      originalGalleryOrder = origOrder.slice();

      var dragSrcIdx = null;

      items.forEach(function(item, idx) {
        item.classList.add('ve-gallery-item');
        item.setAttribute('draggable', 'true');

        // Add grip icon
        var grip = document.createElement('div');
        grip.className = 've-gallery-grip';
        grip.innerHTML = '\\u2630';
        item.style.position = 'relative';
        item.appendChild(grip);

        // Add index badge
        var badge = document.createElement('div');
        badge.className = 've-gallery-idx';
        badge.textContent = String(idx + 1);
        item.appendChild(badge);

        item.addEventListener('dragstart', function(e) {
          if (!document.body.classList.contains('edit-mode')) {
            e.preventDefault();
            return;
          }
          dragSrcIdx = idx;
          item.classList.add('ve-dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(idx));
        });

        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          item.classList.add('ve-drag-over');
        });

        item.addEventListener('dragleave', function() {
          item.classList.remove('ve-drag-over');
        });

        item.addEventListener('drop', function(e) {
          e.preventDefault();
          e.stopPropagation();
          item.classList.remove('ve-drag-over');

          var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
          var toIdx = idx;
          if (isNaN(fromIdx) || fromIdx === toIdx) return;

          // Reorder DOM
          var allItems = Array.from(container.querySelectorAll('.ve-gallery-item'));
          var movedItem = allItems[fromIdx];
          if (!movedItem) return;

          // Remove from current position
          container.removeChild(movedItem);

          // Insert at new position
          var updatedItems = Array.from(container.querySelectorAll('.ve-gallery-item'));
          if (toIdx >= updatedItems.length) {
            container.appendChild(movedItem);
          } else {
            container.insertBefore(movedItem, updatedItems[toIdx]);
          }

          // Update index badges
          var finalItems = container.querySelectorAll('.ve-gallery-item');
          finalItems.forEach(function(fi, i) {
            var b = fi.querySelector('.ve-gallery-idx');
            if (b) b.textContent = String(i + 1);
          });

          // Mark order as changed
          galleryOrderChanged = true;
          showSaveOrderBar(container, sectionId);
        });

        item.addEventListener('dragend', function() {
          item.classList.remove('ve-dragging');
          // Clean up all drag-over states
          items.forEach(function(it) { it.classList.remove('ve-drag-over'); });
        });
      });
    });
  }

  // ── Save Order floating bar ──
  function showSaveOrderBar(container, sectionId) {
    if (saveOrderBar) return; // Already showing

    saveOrderBar = document.createElement('div');
    saveOrderBar.className = 've-save-order-bar';

    var label = document.createElement('span');
    label.textContent = 'Gallery order changed';
    saveOrderBar.appendChild(label);

    var saveBtn = document.createElement('button');
    saveBtn.className = 've-save-order-btn';
    saveBtn.textContent = 'Save Order';
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Collect current order of filenames
      var currentItems = container.querySelectorAll('.ve-gallery-item');
      var filenames = [];
      currentItems.forEach(function(item) {
        var img = item.querySelector('img');
        if (img && img.src) {
          filenames.push(extractFilename(img.src));
        }
      });

      post({
        type: 'gallery-reorder',
        sectionId: sectionId,
        filenames: filenames
      });

      // Update original order
      originalGalleryOrder = filenames.slice();
      galleryOrderChanged = false;
      removeSaveOrderBar();
      showToast('Saving gallery order...');
    });
    saveOrderBar.appendChild(saveBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 've-save-order-btn cancel';
    cancelBtn.textContent = 'Reset';
    cancelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Reload to reset order
      galleryOrderChanged = false;
      removeSaveOrderBar();
      post({ type: 'request-refresh' });
    });
    saveOrderBar.appendChild(cancelBtn);

    document.body.appendChild(saveOrderBar);
  }

  function removeSaveOrderBar() {
    if (saveOrderBar) {
      saveOrderBar.remove();
      saveOrderBar = null;
    }
  }

  // ── Section controls (delete) ──
  function setupSections() {
    var sections = document.querySelectorAll('section[id], [data-section], section[class]');
    var processed = new Set();

    sections.forEach(function(sec) {
      var id = sec.id || (sec.dataset && sec.dataset.section) || '';
      if (!id && sec.className) {
        id = extractSectionIdFromClass(sec.className) || '';
      }
      // Fallback: derive ID from heading text (same as findSectionId)
      if (!id && sec.tagName === 'SECTION') {
        var heading = sec.querySelector('h1, h2, h3');
        if (heading) {
          var ht = (heading.textContent || '').trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
          if (ht.length > 2) id = ht;
        }
        if (!id) {
          var allSec = document.querySelectorAll('section');
          for (var si = 0; si < allSec.length; si++) {
            if (allSec[si] === sec) { id = 'section-' + si; break; }
          }
        }
      }
      if (!id) return;
      if (processed.has(id)) return;
      processed.add(id);

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
    // Validate origin: accept 'null' (srcdoc same-frame) and known dashboard origins
    if (e.origin !== 'null' && !/eternowebstudio|vercel|localhost/.test(e.origin)) return;

    if (e.data && e.data.type === 'toggle-edit') {
      if (e.data.enabled) {
        document.body.classList.add('edit-mode');
      } else {
        document.body.classList.remove('edit-mode');
        revertAllPending();
      }
    }
    if (e.data && e.data.type === 'trigger-save') {
      saveAllPending();
    }
    if (e.data && e.data.type === 'refresh-gallery') {
      post({ type: 'request-refresh' });
    }
  });

  // ── Init ──
  // ── CSS background-image elements (hero-bg, etc.) ──
  function setupBgImages() {
    var bgEls = document.querySelectorAll('.hero-bg, .hero-banner, .page-hero-bg, .section-bg, .banner-bg');
    bgEls.forEach(function(el) {
      var bgImg = window.getComputedStyle(el).backgroundImage;
      if (!bgImg || bgImg === 'none') return;
      var btn = document.createElement('button');
      btn.className = 've-img-btn';
      btn.textContent = 'Change Hero Image';
      btn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:9999;white-space:nowrap;pointer-events:auto;';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        post({ type: 'image-swap', sectionId: findSectionId(el), currentSrc: bgImg, key: 'hero_bg_image' });
      });
      // Don't override position on absolute/fixed elements — find a visible container
      var computed = window.getComputedStyle(el);
      var target = el;
      if (computed.position === 'absolute' || computed.position === 'fixed') {
        // Try hero-content first (has z-index above overlays), then parent section
        var heroContent = el.parentElement && el.parentElement.querySelector('.hero-content');
        target = heroContent || el.parentElement || el;
      }
      if (window.getComputedStyle(target).position === 'static') {
        target.style.position = 'relative';
      }
      target.appendChild(btn);
    });
  }

  function init() {
    document.body.classList.add('edit-mode');
    setupEditableText();
    setupImages();
    setupBgImages();
    setupGalleries();
    setupGalleryDragDrop();
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
  // ── Security: strip original scripts + inline event handlers ──
  // The editor iframe uses allow-same-origin so we can access contentDocument
  // for click-to-edit. This means any <script> in the client's site HTML
  // runs at the dashboard's origin and could steal auth tokens.
  // Strip them — the editor only needs the visual DOM + our injected script.
  let result = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");

  // Inject CSS before </head>
  const cssTag = `<style id="ve-edit-css">${EDIT_CSS}</style>`;

  if (result.includes("</head>")) {
    result = result.replace("</head>", `${cssTag}\n</head>`);
  } else {
    result = cssTag + result;
  }

  // Rewrite relative image src to absolute
  if (baseUrl) {
    const base = baseUrl.replace(/\/$/, "");
    result = result.replace(
      /src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, path) => {
        const cleanPath = path.replace(/^\.\//, "");
        return `src="${base}/${cleanPath}"`;
      }
    );
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
