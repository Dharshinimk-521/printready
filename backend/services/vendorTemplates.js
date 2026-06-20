// services/vendorTemplates.js
//
// Single source of truth for every vendor + product spec.
// The scoring engine, Sharp processor, and PDF generator
// all read from here — change a spec once, it updates everywhere.
//
// New field: fitMode
//   "inside" → shrink to fit within box, may leave padding (posters, art)
//   "cover"  → fill the entire box, crop overflow (T-shirts, mugs, ID photos)

const VENDORS = {

  // PRINTIFY 
  printify: {
    label: "Printify",
    website: "https://printify.com",
    products: {

      tshirt: {
        label:     "T-Shirt (Front Print)",
        icon:      "👕",
        pxWidth:   4500,
        pxHeight:  5400,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   381,
        heightMm:  457.2,
        fitMode:   "cover",   // must fill print area completely
        notes:     "PNG with transparent background preferred. Keep design centered.",
        tags:      ["DTG", "Apparel", "Printify"],
      },

      mug: {
        label:     "Mug (11oz)",
        icon:      "☕",
        pxWidth:   2475,
        pxHeight:  1500,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   215.9,
        heightMm:  93.98,
        fitMode:   "cover",   // full wrap must fill exactly
        notes:     "Full wrap design. Leave 50px safe zone on left and right edges.",
        tags:      ["Sublimation", "Printify"],
      },

      poster: {
        label:     "Poster (18×24in)",
        icon:      "🖼",
        pxWidth:   5400,
        pxHeight:  7200,
        dpi:       300,
        format:    "pdf",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   457.2,
        heightMm:  609.6,
        fitMode:   "inside",  // preserve full artwork, no cropping
        notes:     "RGB only — Printify rejects CMYK files.",
        tags:      ["Print", "Printify"],
      },

      phonecase: {
        label:     "Phone Case",
        icon:      "📱",
        pxWidth:   1200,
        pxHeight:  1200,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   101.6,
        heightMm:  101.6,
        fitMode:   "cover",
        notes:     "Square format. Keep important elements in the centre 80%.",
        tags:      ["Accessories", "Printify"],
      },

    },
  },

  // STICKER MULE 
  stickermule: {
    label: "Sticker Mule",
    website: "https://www.stickermule.com",
    products: {

      sticker: {
        label:     "Die-Cut Sticker",
        icon:      "⭐",
        pxWidth:   2400,
        pxHeight:  2400,
        dpi:       600,
        format:    "pdf",
        colorMode: "CMYK",
        bleed:     true,
        bleedMm:   1.5,
        widthMm:   101.6,
        heightMm:  101.6,
        fitMode:   "inside",  // die-cut shape must be fully visible
        notes:     "600 DPI minimum. CMYK PDF with 1.5mm bleed on all sides.",
        tags:      ["600 DPI", "CMYK", "Die-Cut", "Sticker Mule"],
      },

      sheetsticker: {
        label:     "Sheet Sticker",
        icon:      "📋",
        pxWidth:   3600,
        pxHeight:  2400,
        dpi:       300,
        format:    "pdf",
        colorMode: "CMYK",
        bleed:     true,
        bleedMm:   3,
        widthMm:   152.4,
        heightMm:  101.6,
        fitMode:   "cover",
        notes:     "3mm bleed on all sides. CMYK only.",
        tags:      ["CMYK", "Sheet", "Sticker Mule"],
      },

      label: {
        label:     "Custom Label",
        icon:      "🏷",
        pxWidth:   1800,
        pxHeight:  1200,
        dpi:       300,
        format:    "pdf",
        colorMode: "CMYK",
        bleed:     true,
        bleedMm:   2,
        widthMm:   76.2,
        heightMm:  50.8,
        fitMode:   "cover",
        notes:     "2mm bleed. CMYK PDF preferred.",
        tags:      ["Label", "CMYK", "Sticker Mule"],
      },

    },
  },

  // REDBUBBLE 
  redbubble: {
    label: "Redbubble",
    website: "https://www.redbubble.com",
    products: {

      poster: {
        label:     "Poster / Art Print",
        icon:      "🖼",
        pxWidth:   7632,
        pxHeight:  10728,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   647.7,
        heightMm:  910.8,
        fitMode:   "inside",
        notes:     "Redbubble's largest print size. RGB PNG only. Max 300MB.",
        tags:      ["Art Print", "RGB", "Redbubble"],
      },

      tshirt: {
        label:     "T-Shirt",
        icon:      "👕",
        pxWidth:   4000,
        pxHeight:  4000,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   339.6,
        heightMm:  339.6,
        fitMode:   "cover",
        notes:     "Square canvas. Transparent background recommended.",
        tags:      ["Apparel", "RGB", "Redbubble"],
      },

      sticker: {
        label:     "Sticker",
        icon:      "⭐",
        pxWidth:   2400,
        pxHeight:  2400,
        dpi:       300,
        format:    "png",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   203.7,
        heightMm:  203.7,
        fitMode:   "inside",
        notes:     "PNG with transparent background. Redbubble cuts around the shape automatically.",
        tags:      ["Sticker", "RGB", "Redbubble"],
      },

    },
  },

  // VISTAPRINT 
  vistaprint: {
    label: "Vistaprint",
    website: "https://www.vistaprint.com",
    products: {

      businesscard: {
        label:     "Business Card (3.5×2in)",
        icon:      "🪪",
        pxWidth:   1200,
        pxHeight:  700,
        dpi:       300,
        format:    "pdf",
        colorMode: "CMYK",
        bleed:     true,
        bleedMm:   3.175,
        widthMm:   88.9,
        heightMm:  50.8,
        fitMode:   "cover",
        notes:     "3mm bleed all sides. CMYK PDF. Embed all fonts.",
        tags:      ["Business Card", "CMYK", "Vistaprint"],
      },

      flyer: {
        label:     "Flyer (A5)",
        icon:      "📄",
        pxWidth:   1748,
        pxHeight:  2480,
        dpi:       300,
        format:    "pdf",
        colorMode: "CMYK",
        bleed:     true,
        bleedMm:   3,
        widthMm:   148,
        heightMm:  210,
        fitMode:   "cover",
        notes:     "A5 with 3mm bleed. CMYK PDF.",
        tags:      ["Flyer", "CMYK", "Vistaprint"],
      },

      banner: {
        label:     "Vinyl Banner (2×6ft)",
        icon:      "📢",
        pxWidth:   5400,
        pxHeight:  1800,
        dpi:       150,
        format:    "pdf",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   1828.8,
        heightMm:  609.6,
        fitMode:   "cover",
        notes:     "150 DPI sufficient at viewing distance. Keep text 1in from edges.",
        tags:      ["Banner", "Large Format", "Vistaprint"],
      },

    },
  },

  // ID PHOTO SERVICES 
  // A standalone "vendor" for ID/passport photos.
  // government/visa applications with strict, fixed specs.
  idphoto: {
    label: "ID Photo Services",
    website: null,
    products: {

      passport_india: {
        label:     "Passport Photo (India)",
        icon:      "🪪",
        pxWidth:   413,       // 35mm at 300 DPI
        pxHeight:  531,       // 45mm at 300 DPI
        dpi:       300,
        format:    "pdf",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   35,
        heightMm:  45,
        fitMode:   "cover",   // face must fill frame correctly
        faceCenterRequired: true, // flag for future face-detection feature
        notes:     "35×45mm, plain light background, face centered and forward-facing. " +
                    "Face auto-centering is planned for a future version — for now, " +
                    "center the face manually before uploading.",
        tags:      ["ID Photo", "Passport", "300 DPI"],
      },

      passport_us: {
        label:     "Passport Photo (USA)",
        icon:      "🪪",
        pxWidth:   600,       // 2x2 inch at 300 DPI
        pxHeight:  600,
        dpi:       300,
        format:    "pdf",
        colorMode: "RGB",
        bleed:     false,
        widthMm:   50.8,
        heightMm:  50.8,
        fitMode:   "cover",
        faceCenterRequired: true,
        notes:     "2×2 inch square, plain white background, face centered. " +
                    "Face auto-centering is planned for a future version.",
        tags:      ["ID Photo", "Passport", "300 DPI"],
      },

    },
  },

};

// Helper functions 
function getVendorList() {
  return Object.entries(VENDORS).map(([id, v]) => ({
    id,
    label:        v.label,
    website:      v.website,
    productCount: Object.keys(v.products).length,
  }));
}

function getProductsForVendor(vendorId) {
  const vendor = VENDORS[vendorId];
  if (!vendor) return null;

  return Object.entries(vendor.products).map(([id, p]) => ({
    id,
    ...p,
  }));
}

function getSpec(vendorId, productId) {
  return VENDORS[vendorId]?.products[productId] || null;
}

module.exports = {
  VENDORS,
  getVendorList,
  getProductsForVendor,
  getSpec,
};