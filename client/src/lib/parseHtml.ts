/*
  DESIGN: Dark Forge — HTML Section Parser
  Extracts editable section groups from an Eterno site's HTML.
  Each group has an id, icon, title, and array of fields.
  
  Common sections across all Eterno sites:
  - Hero (hero): bg image, eyebrow, title, subtitle, CTA
  - About (about): photo, title, bio paragraphs, stats
  - Gallery (gallery): title, images array
  - Booking (booking): URL, title, details, form fields
  - Testimonials (testimonials): title, review cards
  - FAQ (faq): question/answer pairs
  - Shop (shop): title, description, link
  - Styles (styles/specialty): title, style cards
  - Services (services): title, service cards with pricing
  - Contact: email
  - Generic catch-all for any other section
*/

export interface SectionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "photo" | "form_fields" | "style_options";
  value: string | FormFieldDef[] | string[];
}

export interface FormFieldDef {
  name: string;
  placeholder: string;
  type: string;
}

export interface FaqPair {
  question: string;
  answer: string;
}

export interface SectionGroup {
  id: string;
  icon: string;
  title: string;
  fields: SectionField[];
  faqPairs?: FaqPair[];
  isGallery?: boolean;
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function extractAboutFromSection(html: string) {
  const aboutSecMatch =
    html.match(/<section[^>]+id="about"[^>]*>([\s\S]*?)<\/section>/i) ||
    html.match(/<section[^>]+id="nosotros"[^>]*>([\s\S]*?)<\/section>/i);
  if (!aboutSecMatch) return null;
  const secHtml = aboutSecMatch[1];
  const pTags = Array.from(secHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
  const bioParas = pTags
    .map((m) => strip(m[1]))
    .filter((t) => t && !t.match(/^[A-Z\s]{3,30}$/) && t.length > 5);
  const h2Match = secHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const aboutTitle = h2Match ? strip(h2Match[1]) : "";
  const imgMatch = secHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
  const aboutImg = imgMatch ? imgMatch[1] : "";
  return { bioParas, aboutTitle, aboutImg };
}

export function parseSections(html: string): SectionGroup[] {
  const groups: SectionGroup[] = [];

  // ── HERO ──
  const heroFields: SectionField[] = [];
  const heroBgMatch =
    html.match(/background-image:\s*url\(['"]?(img\/[^'")]+)['"]?\)/i) ||
    html.match(/background:\s*url\(['"]?(img\/[^'")]+)['"]?\)/i);
  heroFields.push({ key: "hero_bg", label: "Background Photo", type: "photo", value: heroBgMatch ? heroBgMatch[1] : "" });

  const heroEyebrowMatch = html.match(/<[^>]*class="[^"]*hero-eyebrow[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
  heroFields.push({ key: "hero_eyebrow", label: "Title / Role (above name)", type: "text", value: heroEyebrowMatch ? strip(heroEyebrowMatch[1]) : "" });

  const heroTitleMatch =
    html.match(/<h1[^>]*class="[^"]*hero-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1[^>]*class="[^"]*hero-name[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1[^>]*data-en="[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1(?:[^>]*)>([\s\S]*?)<\/h1>/i);
  heroFields.push({ key: "hero_title", label: "Artist Name", type: "text", value: heroTitleMatch ? strip(heroTitleMatch[1]) : "" });

  const heroSubMatch = html.match(/<[^>]*class="[^"]*hero-(?:subtitle|tagline|sub)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
  heroFields.push({ key: "hero_subtitle", label: "Tagline", type: "text", value: heroSubMatch ? strip(heroSubMatch[1]) : "" });

  const typedPhrasesMatch = html.match(/const phrases\s*=\s*\[([\s\S]*?)\]/i);
  if (typedPhrasesMatch) {
    const phrases = Array.from(typedPhrasesMatch[1].matchAll(/"([^"]+)"/g)).map((m) => m[1]);
    if (phrases.length) {
      heroFields.push({ key: "hero_typed_phrases", label: "Rotating Phrases (comma-separated)", type: "textarea", value: phrases.join(", ") });
    }
  }

  const heroCTAMatch = html.match(/<a[^>]*class="[^"]*hero-cta[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  heroFields.push({ key: "hero_cta_text", label: "CTA Button Text", type: "text", value: heroCTAMatch ? strip(heroCTAMatch[1]) : "Book Now" });

  groups.push({ id: "hero", icon: "🦸", title: "Hero", fields: heroFields });

  // ── INSTAGRAM HANDLE ──
  const igMatch = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  groups.push({
    id: "instagram",
    icon: "📸",
    title: "Instagram Handle",
    fields: [{ key: "ig_handle", label: "Instagram Handle", type: "text", value: igMatch ? `@${igMatch[1]}` : "" }],
  });

  // ── FOOTER NAME ──
  const footerMatch = html.match(/©\s*\d{4}\s+([^.<]+?)\.?\s*All rights reserved/i);
  const logoMatch = html.match(/<span class="footer-logo">([^<]+)<\/span>/i);
  groups.push({
    id: "footer",
    icon: "©",
    title: "Footer Name",
    fields: [{ key: "footer_name", label: "Footer Name", type: "text", value: footerMatch ? footerMatch[1].trim() : logoMatch ? logoMatch[1].trim() : "" }],
  });

  // ── PHONE / LOCATION / HOURS ──
  const phoneFields: SectionField[] = [];
  const navPhoneMatch =
    html.match(/<a[^>]*class="nav-phone"[^>]*>([^<]*)<\/a>/i) ||
    html.match(/<a[^>]*class="[^"]*nav-phone[^"]*"[^>]*>([^<]*)<\/a>/i);
  if (navPhoneMatch) phoneFields.push({ key: "phone_number", label: "Phone Number", type: "text", value: navPhoneMatch[1].trim() });

  const addrMatch = html.match(/<div[^>]*class="location-text"[^>]*>[\s\S]*?<h4[^>]*>[^<]*[Aa]ddress[^<]*<\/h4>\s*<p[^>]*>([^<]*)<\/p>/i);
  if (addrMatch) phoneFields.push({ key: "location_address", label: "Address", type: "text", value: addrMatch[1].trim() });

  const hoursGridMatch = html.match(/<div[^>]*class="hours-grid"[^>]*>([\s\S]*?)<\/div>/i);
  if (hoursGridMatch) {
    const dayMatches = Array.from(hoursGridMatch[1].matchAll(/<span[^>]*class="hours-day"[^>]*>([^<]*)<\/span>\s*<span[^>]*class="hours-time"[^>]*>([^<]*)<\/span>/gi));
    if (dayMatches.length) {
      const hoursText = dayMatches.map((m) => m[1].trim() + ": " + m[2].trim()).join("\n");
      phoneFields.push({ key: "business_hours", label: "Business Hours (one per line)", type: "textarea", value: hoursText });
    }
  }
  if (phoneFields.length) groups.push({ id: "phone_location", icon: "📍", title: "Phone, Location & Hours", fields: phoneFields });

  // ── ABOUT ──
  let aboutData = extractAboutFromSection(html);
  if (!aboutData) {
    const aboutMatch =
      html.match(/<div\s+class="[^"]*about-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div\s+class="[^"]*about-inner[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div\s+class="[^"]*about-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (aboutMatch) {
      const rawHtml = aboutMatch[1];
      const pTags = Array.from(rawHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
      const bioParas = pTags.map((m) => strip(m[1])).filter((t) => t && t.length > 5);
      if (bioParas.length === 0) {
        const plainText = strip(rawHtml);
        if (plainText) bioParas.push(plainText);
      }
      const h2Match = rawHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      aboutData = { bioParas, aboutTitle: h2Match ? strip(h2Match[1]) : "", aboutImg: "" };
    }
  }
  if (aboutData && (aboutData.bioParas.length > 0 || aboutData.aboutTitle)) {
    const aboutFields: SectionField[] = [];
    const aboutImgMatch =
      html.match(/<div\s+class="[^"]*about-image[^"]*"[^>]*>\s*<img[^>]*src="([^"]+)"/i) ||
      html.match(/<img[^>]*class="[^"]*about-photo[^"]*"[^>]*src="([^"]+)"/i) ||
      html.match(/<img[^>]*class="[^"]*about-portrait[^"]*"[^>]*src="([^"]+)"/i);
    const imgSrc = aboutData.aboutImg || (aboutImgMatch ? aboutImgMatch[1] : "");
    aboutFields.push({ key: "about_photo", label: "Artist Photo", type: "photo", value: imgSrc });
    if (aboutData.aboutTitle) aboutFields.push({ key: "about_title", label: "Section Title", type: "text", value: aboutData.aboutTitle });
    aboutFields.push({ key: "about", label: "Bio", type: "textarea", value: aboutData.bioParas.join("\n\n") });

    // Stats
    const aboutSecBody = (html.match(/<section[^>]+id="about"[^>]*>([\s\S]*?)<\/section>/i) || ["", ""])[1];
    const statNumbers = Array.from(aboutSecBody.matchAll(/<span[^>]*class="[^"]*stat-number[^"]*"[^>]*>([\s\S]*?)<\/span>/gi));
    const statLabels = Array.from(aboutSecBody.matchAll(/<span[^>]*class="[^"]*stat-label[^"]*"[^>]*>([\s\S]*?)<\/span>/gi));
    statNumbers.forEach((m, i) => {
      if (i >= 6) return;
      aboutFields.push({ key: `about_stat_number_${i}`, label: `Stat ${i + 1} Number`, type: "text", value: strip(m[1]) });
      aboutFields.push({ key: `about_stat_label_${i}`, label: `Stat ${i + 1} Label`, type: "text", value: statLabels[i] ? strip(statLabels[i][1]) : "" });
    });
    groups.push({ id: "about", icon: "🎨", title: "About", fields: aboutFields });
  }

  // ── BOOKING ──
  const bookingFields: SectionField[] = [];
  const bookMatch =
    html.match(/class="[^"]*float-book[^"]*"[^>]*href="([^"]+)"/i) ||
    html.match(/href="([^"]+)"[^>]*class="[^"]*float-book[^"]*"/i) ||
    html.match(/class="[^"]*hero-cta[^"]*"[^>]*href="([^"]+)"/i) ||
    html.match(/href="([^"]+)"[^>]*class="[^"]*hero-cta[^"]*"/i);
  if (bookMatch) bookingFields.push({ key: "booking", label: "Booking Button URL", type: "text", value: bookMatch[1] });

  const bookTitleMatch = html.match(/id="book(?:ing)?"[\s\S]{0,400}?class="[^"]*section-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
  if (bookTitleMatch) bookingFields.push({ key: "booking_title", label: "Section Title", type: "text", value: strip(bookTitleMatch[1]) });

  const formEmailMatch = html.match(/action="https?:\/\/formsubmit\.co\/([^"]+)"/i);
  if (formEmailMatch) bookingFields.push({ key: "booking_email", label: "Form Delivery Email", type: "text", value: formEmailMatch[1] });

  const bookingIntroMatch = html.match(/<div[^>]*class="[^"]*booking-intro[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (bookingIntroMatch) bookingFields.push({ key: "booking_intro", label: "Intro Text", type: "textarea", value: strip(bookingIntroMatch[1]) });

  // Booking form fields
  const formEl =
    html.match(/<form[^>]*id="booking-form"[^>]*>([\s\S]*?)<\/form>/i) ||
    html.match(/<form[^>]*class="[^"]*booking[^"]*"[^>]*>([\s\S]*?)<\/form>/i) ||
    html.match(/<form[^>]*action="[^"]*formsubmit[^"]*"[^>]*>([\s\S]*?)<\/form>/i);
  if (formEl) {
    const fieldMatches = Array.from(formEl[1].matchAll(/<input[^>]*name="([^"]+)"[^>]*(?:placeholder="([^"]*)")?[^>]*>|<textarea[^>]*name="([^"]+)"[^>]*(?:placeholder="([^"]*)")?[^>]*>/gi));
    const parsedFields: FormFieldDef[] = fieldMatches
      .filter((m) => !["_next", "_subject", "_captcha", "_template"].includes((m[1] || m[3] || "").toLowerCase()))
      .map((m) => ({
        name: m[1] || m[3] || "",
        placeholder: m[2] || m[4] || "",
        type: m[0].toLowerCase().startsWith("<textarea") ? "textarea" : "text",
      }));
    if (parsedFields.length) bookingFields.push({ key: "booking_form_fields", label: "Form Fields", type: "form_fields", value: parsedFields });
  }

  // Style/service dropdown
  const styleSelectMatch = html.match(/<select[^>]*id="bstyle"[^>]*>([\s\S]*?)<\/select>/i);
  if (styleSelectMatch) {
    const optMatches = Array.from(styleSelectMatch[1].matchAll(/<option[^>]*>([^<]+)<\/option>/gi));
    const opts = [...new Set(optMatches.map((m) => m[1].trim()))];
    if (opts.length) bookingFields.push({ key: "booking_style_options", label: "Style/Service Options (one per line)", type: "style_options", value: opts });
  }

  if (bookingFields.length) groups.push({ id: "booking", icon: "📅", title: "Booking", fields: bookingFields });

  // ── FAQ ──
  const faqSecMatch = html.match(/<section[^>]+id="faq"[^>]*>([\s\S]*?)<\/section>/i);
  if (faqSecMatch) {
    const faqHtml = faqSecMatch[1];
    const qMatches = Array.from(faqHtml.matchAll(/<button[^>]*class="[^"]*faq-question[^"]*"[^>]*>([\s\S]*?)<\/button>/gi));
    const aMatches = Array.from(faqHtml.matchAll(/<div[^>]*class="[^"]*faq-answer[^"]*"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/gi));
    if (qMatches.length > 0) {
      const faqPairs: FaqPair[] = qMatches.map((q, i) => ({
        question: strip(q[1]),
        answer: aMatches[i] ? strip(aMatches[i][1]) : "",
      }));
      groups.push({ id: "faq", icon: "❓", title: "FAQ", fields: [], faqPairs });
    }
  }

  // ── CONTACT ──
  const emailMatch = html.match(/href=["']mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})["']/i);
  if (emailMatch) {
    groups.push({ id: "contact", icon: "📞", title: "Contact", fields: [{ key: "contact_email", label: "Contact Email", type: "text", value: emailMatch[1] }] });
  }

  // ── TESTIMONIALS ──
  const testimSecMatch = html.match(/<section[^>]+id="testimonials"[^>]*>([\s\S]*?)<\/section>/i);
  if (testimSecMatch) {
    const tsBody = testimSecMatch[1];
    const tsTitle = tsBody.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const tsDesc = tsBody.match(/<p[^>]*(?:class="[^"]*reveal[^"]*")?[^>]*>([^<]{10,})<\/p>/i);
    const tsFields: SectionField[] = [];
    if (tsTitle) tsFields.push({ key: "section_title__testimonials", label: "Section Title", type: "text", value: strip(tsTitle[1]) });
    if (tsDesc) tsFields.push({ key: "section_body__testimonials", label: "Description", type: "textarea", value: strip(tsDesc[1]) });
    const tsCardParts = tsBody.split(/<div[^>]*class="[^"]*testimonial-card[^"]*"[^>]*>/i).slice(1);
    tsCardParts.forEach((card, i) => {
      if (i >= 6) return;
      const textM = card.match(/<p[^>]*class="[^"]*testimonial-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const authorM = card.match(/<span[^>]*class="[^"]*testimonial-author[^"]*"[^>]*>([^<]*)<\/span>/i);
      const tText = textM ? strip(textM[1]) : "";
      const tAuthor = authorM ? authorM[1].trim() : "";
      if (tText || tAuthor) {
        tsFields.push({ key: `testimonial__${i}__text`, label: `Review ${i + 1} Text`, type: "textarea", value: tText });
        tsFields.push({ key: `testimonial__${i}__author`, label: `Review ${i + 1} Author`, type: "text", value: tAuthor });
      }
    });
    if (tsFields.length) groups.push({ id: "testimonials", icon: "⭐", title: tsTitle ? strip(tsTitle[1]) : "Testimonials", fields: tsFields });
  }

  // ── SHOP ──
  const shopSecMatch = html.match(/<section[^>]+id="shop"[^>]*>([\s\S]*?)<\/section>/i);
  if (shopSecMatch) {
    const shBody = shopSecMatch[1];
    const shTitle = shBody.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const shDesc = shBody.match(/<p[^>]*class="[^"]*reveal[^"]*"[^>]*>([\s\S]*?)<\/p>/i) || shBody.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const shLink = shBody.match(/href="(https?:\/\/[^"]+)"/i);
    const shFields: SectionField[] = [];
    if (shTitle) shFields.push({ key: "section_title__shop", label: "Section Title", type: "text", value: strip(shTitle[1]) });
    if (shDesc) shFields.push({ key: "section_body__shop", label: "Description", type: "textarea", value: strip(shDesc[1]) });
    if (shLink) shFields.push({ key: "shop_link", label: "Shop URL", type: "text", value: shLink[1] });
    if (shFields.length) groups.push({ id: "shop", icon: "🛍️", title: shTitle ? strip(shTitle[1]) : "Shop", fields: shFields });
  }

  // ── STYLES / SPECIALTY ──
  const stylesSecMatch = html.match(/<section[^>]+id="(?:styles|specialty)"[^>]*>([\s\S]*?)<\/section>/i);
  if (stylesSecMatch) {
    const stylesBody = stylesSecMatch[1];
    const stylesFields: SectionField[] = [];
    const stylesTitleMatch = stylesBody.match(/<h2[^>]*class="[^"]*section-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    if (stylesTitleMatch) stylesFields.push({ key: "styles_title", label: "Section Title", type: "textarea", value: strip(stylesTitleMatch[1]) });
    const cardSections = stylesBody.split(/<div[^>]*class="[^"]*style-card[^"]*"[^>]*>/i).slice(1);
    cardSections.forEach((cardHtml, i) => {
      if (i >= 6) return;
      const titleMatch = cardHtml.match(/<h3[^>]*data-en="([^"]*)"/) || cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const cardTitle = titleMatch ? strip(titleMatch[1]) : "";
      const descMatch = cardHtml.match(/<p[^>]*data-en="([^"]*)"/) || cardHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const cardDesc = descMatch ? strip(descMatch[1]) : "";
      if (cardTitle) {
        stylesFields.push({ key: `style_card_title_${i}`, label: `Style ${i + 1} Title`, type: "text", value: cardTitle });
        stylesFields.push({ key: `style_card_desc_${i}`, label: `Style ${i + 1} Description`, type: "textarea", value: cardDesc });
      }
    });
    if (stylesFields.length) groups.push({ id: "styles", icon: "✦", title: "Styles & Specialties", fields: stylesFields });
  }

  // ── SERVICES ──
  const servicesSecMatch = html.match(/<section[^>]+id="services"[^>]*>([\s\S]*?)<\/section>/i);
  if (servicesSecMatch) {
    const servBody = servicesSecMatch[1];
    const servFields: SectionField[] = [];
    const servTitleMatch = servBody.match(/<h2[^>]*class="[^"]*section-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
    if (servTitleMatch) servFields.push({ key: "section_title__services", label: "Section Title", type: "text", value: strip(servTitleMatch[1]) });
    const servCardParts = servBody.split(/<div[^>]*class="[^"]*service-card[^"]*"[^>]*>/i).slice(1);
    servCardParts.forEach((cardHtml, i) => {
      if (i >= 6) return;
      const titleMatch = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const descMatch = cardHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const priceMatch = cardHtml.match(/<a[^>]*class="[^"]*service-price[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      if (titleMatch) {
        servFields.push({ key: `services__card_title_${i}`, label: `Service ${i + 1} Title`, type: "text", value: strip(titleMatch[1]) });
        if (descMatch) servFields.push({ key: `services__card_desc_${i}`, label: `Service ${i + 1} Description`, type: "textarea", value: strip(descMatch[1]) });
        if (priceMatch) servFields.push({ key: `service_price_${i}`, label: `Service ${i + 1} Price`, type: "text", value: strip(priceMatch[1]) });
      }
    });
    if (servFields.length) groups.push({ id: "services", icon: "💰", title: "Services & Pricing", fields: servFields });
  }

  // ── GENERIC CATCH-ALL ──
  const handledIds = new Set(groups.map((g) => g.id));
  handledIds.add("gallery");
  const allSecRe = /<section[^>]+id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/gi;
  let csm;
  while ((csm = allSecRe.exec(html)) !== null) {
    const secId = csm[1];
    if (handledIds.has(secId)) continue;
    handledIds.add(secId);
    const secBody = csm[2];
    const fields: SectionField[] = [];

    const h2M = secBody.match(/<h2[^>]*class="[^"]*section-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || secBody.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const secTitle = h2M ? strip(h2M[1]) : secId.charAt(0).toUpperCase() + secId.slice(1);
    fields.push({ key: `section_title__${secId}`, label: "Section Title", type: "text", value: secTitle });

    const labelM = secBody.match(/<p[^>]*class="[^"]*section-label[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (labelM) fields.push({ key: `section_label__${secId}`, label: "Section Label", type: "text", value: strip(labelM[1]) });

    const isGallery = /class="[^"]*gallery[_-]{1,2}(?:grid|list|container|wrap)/.test(secBody);

    if (!isGallery) {
      const allP = Array.from(secBody.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
      const bodyParts = allP
        .map((m) => strip(m[1]))
        .filter((t) => t && t.length > 5 && !t.match(/^[A-Z\s]{3,30}$/));
      const bodyText = bodyParts.join("\n\n");
      if (bodyText) fields.push({ key: `${secId}__content`, label: "Content", type: "textarea", value: bodyText });
    }

    const extLink = secBody.match(/href="(https?:\/\/[^"]+)"/i);
    if (extLink) fields.push({ key: `${secId}__link`, label: "Link URL", type: "text", value: extLink[1] });

    if (fields.length > 1 || isGallery) {
      groups.push({ id: secId, icon: isGallery ? "📷" : "📄", title: secTitle, fields, isGallery });
    }
  }

  return groups;
}

/**
 * Parse gallery images from site HTML for a given section.
 */
export function parseGalleryImages(html: string, sectionId = "gallery"): string[] {
  const secMatch = html.match(new RegExp(`<section[^>]+(?:id="${sectionId}"|class="[^"]*gallery-section[^"]*")[^>]*>([\\s\\S]*?)<\\/section>`, "i"));
  if (!secMatch) return [];
  const imgs = Array.from(secMatch[1].matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi));
  return imgs.map((m) => m[1]);
}
