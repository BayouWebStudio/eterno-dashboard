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
.ve-artist-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(180,0,0,0.8);
  color: #fff;
  border: none;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.ve-artist-delete:hover { background: rgba(220,0,0,0.95); }
body.edit-mode .artist-radio-item { position: relative; }
body.edit-mode .artist-radio-item:hover .ve-artist-delete { display: flex; }
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
  var originalText = '';
  var galleryOrderChanged = false;
  var originalGalleryOrder = [];
  var saveOrderBar = null;

  // '*' is required for srcdoc iframes (origin is "null"). Safe because
  // iframe content is fully controlled via srcdoc — we inject it ourselves.
  function post(msg) {
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
    // Gallery variants
    if (cls.indexOf('gallery-body') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('masonry-grid') >= 0) return 'tattoo-gallery';
    if (cls.indexOf('gallery-section') >= 0) return 'gallery';
    // Hero
    if (cls.indexOf('page-hero') >= 0) return 'hero';
    // About variants (index: about-preview/about-grid, sub-pages: about-body/about-layout, bio-section, stats-section)
    if (cls.indexOf('about-preview') >= 0 || cls.indexOf('about-grid') >= 0) return 'about';
    if (cls.indexOf('about-body') >= 0 || cls.indexOf('about-layout') >= 0) return 'about';
    if (cls.indexOf('stats-section') >= 0 || cls.indexOf('bio-section') >= 0) return 'about';
    // Booking variants (index: booking-preview, sub-pages: booking-body/booking-layout/booking-info, tattoos: booking-cta-section)
    if (cls.indexOf('booking-preview') >= 0 || cls.indexOf('booking-body') >= 0 || cls.indexOf('booking-layout') >= 0 || cls.indexOf('booking-info') >= 0) return 'booking';
    if (cls.indexOf('booking-cta') >= 0) return 'booking';
    // Testimonials variants (index: testimonials-preview, sub-pages: testimonials-body, share-section)
    if (cls.indexOf('testimonials-preview') >= 0 || cls.indexOf('testimonials-body') >= 0) return 'testimonials';
    if (cls.indexOf('share-section') >= 0 || cls.indexOf('placeholder-block') >= 0) return 'testimonials';

    var secMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-section(?:\\s|$)/i);
    if (secMatch) return secMatch[1];

    var containerMatch = cls.match(/(?:^|\\s)([a-z][a-z0-9-]*)-(?:content|area|wrapper|block|body|info|layout)(?:\\s|$)/i);
    if (containerMatch) {
      var name = containerMatch[1];
      // Skip generic layout names AND component-level names (cards, items, tags etc.)
      if (['main', 'page', 'site', 'app', 'inner', 'outer', 'flex', 'grid'].indexOf(name) < 0
          && !/-(?:card|item|tag|btn|button|link|badge|icon|img|text|label|row|col)$/.test(name)) {
        return name;
      }
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

    var tag = el.tagName.toLowerCase();
    var sectionId = findSectionId(el);
    var cls = el.className || '';

    if (sectionId === 'hero' || sectionId === 'page-hero') {
      if (cls.indexOf('hero-eyebrow') >= 0 || cls.indexOf('page-eyebrow') >= 0) return 'hero_eyebrow';
      if (cls.indexOf('hero-title') >= 0 || cls.indexOf('hero-name') >= 0) return 'hero_title';
      if (cls.indexOf('hero-subtitle') >= 0 || cls.indexOf('hero-tagline') >= 0 || cls.indexOf('hero-sub') >= 0) return 'hero_subtitle';
      if (cls.indexOf('hero-cta') >= 0) return 'hero_cta_text';
      if (tag === 'h1') return 'hero_title';
      if (tag === 'h2' || tag === 'h3') return 'hero_subtitle';
      if (tag === 'p') return 'hero_subtitle';
      if (tag === 'a') return 'hero_cta_text';
      return 'hero_title';
    }

    if (sectionId === 'about' || sectionId === 'nosotros') {
      if (cls.indexOf('stat-num') >= 0) {
        var numIdx = getStatIndex(el, 'stat-num');
        if (numIdx >= 0) return 'about_stat_number_' + numIdx;
      }
      if (cls.indexOf('stat-big') >= 0) {
        var bigIdx = getStatIndex(el, 'stat-big');
        if (bigIdx >= 0) return 'about_stat_number_' + bigIdx;
      }
      if (cls.indexOf('stat-label') >= 0) {
        var lblIdx = getStatIndex(el, 'stat-label');
        if (lblIdx >= 0) return 'about_stat_label_' + lblIdx;
      }
      if (cls.indexOf('stat-small') >= 0) {
        var smIdx = getStatIndex(el, 'stat-small');
        if (smIdx >= 0) return 'about_stat_label_' + smIdx;
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
      if (tag === 'a') return 'booking_cta_text';
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
      if (cls.indexOf('faq-question') >= 0) {
        var faqIdx = getCardIndex(el, 'faq-item');
        return 'faq_question_' + (faqIdx >= 0 ? faqIdx : 0);
      }
      if (cls.indexOf('faq-answer') >= 0) {
        var faqAnsIdx = getCardIndex(el, 'faq-item');
        return 'faq_answer_' + (faqAnsIdx >= 0 ? faqAnsIdx : 0);
      }
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
      if (tag === 'a') return 'shop_link_text';
      return 'section_title__shop';
    }

    if (sectionId === 'contact') return 'contact_email';
    if (sectionId === 'instagram') return 'ig_handle';

    if (sectionId && sectionId !== 'unknown') {
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'section_title__' + sectionId;
      if (tag === 'p' || tag === 'blockquote' || tag === 'li') return sectionId + '__content';
      if (tag === 'a') return sectionId + '__link_text';
      return 'section_title__' + sectionId;
    }

    return 'unknown_' + tag;
  }

  function getStatIndex(el, statClass) {
    // Find all elements with the same stat class within the about/stats section
    // Try <section> first, then fall back to common stat container classes
    var section = el.closest ? (el.closest('section') || el.closest('.stats-section') || el.closest('.about-preview') || el.closest('.about-grid') || el.closest('.about-body') || el.closest('.about-layout')) : null;
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

  // ── Check if an element is inside a repeating card/item (not individually saveable) ──
  function isInsideCard(el) {
    // Walk up looking for card/item containers, but stop at section level
    var node = el.parentElement;
    while (node && node !== document.body) {
      if (node.tagName === 'SECTION') return false; // reached section, no card found
      var cls = (node.className || '').toString();
      if (/\b\w+[-_](?:card|item|slide|tile)\b/i.test(cls) && !/\b(?:grid|list|container|section|wrapper)\b/i.test(cls)) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
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
      if (el.closest('script') || el.closest('style') || el.closest('nav') || el.closest('.ve-section-controls')) return;
      if (el.tagName === 'A' && el.querySelector('img')) return;
      // Skip structural containers (span/div with child elements are layout wrappers, not text nodes)
      if ((el.tagName === 'SPAN' || el.tagName === 'DIV') && el.children.length > 0) return;
      // Skip elements inside repeating card/item components — these can't be
      // individually targeted by the save endpoint and would overwrite the
      // section heading instead. Users should edit these via Source HTML.
      if (isInsideCard(el)) return;
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

      if (sectionId === 'unknown') {
        showToast('Could not identify section \\u2014 edit not saved');
        return;
      }

      post({
        type: 'text-edit',
        sectionId: sectionId,
        key: key,
        value: newText,
        originalValue: originalText.trim()
      });
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
      btn.style.cssText = 'position:absolute;top:16px;right:16px;z-index:200;';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        post({ type: 'image-swap', sectionId: findSectionId(el), currentSrc: bgImg, key: 'hero_bg' });
      });
      // Append to parent container if the bg element is position:absolute (e.g. .hero-bg inside .hero)
      var computed = window.getComputedStyle(el);
      var target = (computed.position === 'absolute' || computed.position === 'fixed') && el.parentElement ? el.parentElement : el;
      target.style.position = 'relative';
      target.appendChild(btn);
    });
  }

  // ── Artist card delete buttons (booking page) ──
  function setupArtistCards() {
    var cards = document.querySelectorAll('.artist-radio-item');
    cards.forEach(function(card) {
      var nameEl = card.querySelector('.artist-radio-name');
      if (!nameEl) return;
      var artistName = nameEl.textContent || '';
      var delBtn = document.createElement('button');
      delBtn.className = 've-artist-delete';
      delBtn.textContent = '×';
      delBtn.title = 'Remove ' + artistName;
      delBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Remove "' + artistName + '" from booking options?')) {
          card.remove();
          post({ type: 'artist-delete', artistName: artistName });
        }
      });
      card.appendChild(delBtn);
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
    setupArtistCards();
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
    result = result.replace(
      /(<[a-z][a-z0-9]*\b[^>]*?\s)src="(?!https?:\/\/)(?!\/\/)(?!data:)([^"]+)"/gi,
      (match, tagPrefix, path) => {
        // Only rewrite src for image-related tags (img, picture); skip script, source, video, audio, iframe, embed
        const tagMatch = tagPrefix.match(/^<(\w+)/i);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : "";
        if (["script", "source", "video", "audio", "iframe", "embed", "track"].includes(tag)) {
          return match;
        }
        const cleanPath = path.replace(/^\.\//, "");
        return `${tagPrefix}src="${base}/${cleanPath}"`;
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
