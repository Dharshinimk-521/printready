
// Generates a print-ready PDF from the processed image buffer.
// pdf-lib works entirely with Buffers - no temp files, no
// system dependencies like Ghostscript needed.
//
// What makes the output "print-ready":
//   1. Exact physical page size (from spec, converted mm -> PDF points)
//   2. Bleed area added to the page if spec requires it
//   3. Crop marks drawn at the trim line corners
//   4. Document metadata (title, DPI, colour mode) embedded

const { PDFDocument, rgb } = require("pdf-lib");
const logger = require("../utils/logger");

// PDF internally measures everything in "points" not millimeters.
// 1mm = 2.8346 points. This conversion happens constantly below.
const MM_TO_PT = 2.8346;

// Standard bleed if a spec doesn't specify its own bleedMm value
const DEFAULT_BLEED_MM = 3;

// ---generatePdf
// imageBuffer   = the already-processed image from Sharp (correct pixel dimensions, correct DPI embedded)
// spec          = the vendor template spec (tells us page size, bleed)
// originalName  = original filename, used in PDF metadata only
async function generatePdf(imageBuffer, spec, originalName = "artwork") {
  logger.info("Generating PDF", { product: spec.label });

  const pdfDoc = await PDFDocument.create();

  // ---Calculate page size 
  // If spec requires bleed, the page itself needs to be bigger
  // than the "trim size" to accommodate the extra bleed margin on every side.
  const bleedMm = spec.bleed ? (spec.bleedMm || DEFAULT_BLEED_MM) : 0;
  const bleedPt = bleedMm * MM_TO_PT;

  const pageWidthPt  = (spec.widthMm  * MM_TO_PT) + (bleedPt * 2);
  const pageHeightPt = (spec.heightMm * MM_TO_PT) + (bleedPt * 2);

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // -- Embed the image 
  // pdf-lib needs to know if it's a JPEG or PNG to embed correctly.
  // We try JPEG first since that's what Sharp outputs for PDF-format
  // specs, then fall back to PNG.
  let embeddedImage;
  try {
    embeddedImage = await pdfDoc.embedJpg(imageBuffer);
  } catch {
    embeddedImage = await pdfDoc.embedPng(imageBuffer);
  }

  // -- Draw the image 
  // The image fills the ENTIRE page including the bleed area.
  // x=0, y=0 means start from the bottom-left corner (PDF coordinate system starts at bottom-left, not top-left like CSS/HTML).
  page.drawImage(embeddedImage, {
    x:0,
    y:0,
    width:pageWidthPt,
    height:pageHeightPt,
  });

  // -- Draw crop marks 
  // Only needed if this spec requires bleed.
  // Products without bleed (T-shirts, mugs) don't get cut with a blade against a trim line, so crop marks are meaningless there.
  if (spec.bleed) {
    drawCropMarks(page, pageWidthPt, pageHeightPt, bleedPt);
  }

  // Document metadata 
  // This shows up when a printer opens the PDF in Acrobat or Preview.
  // Useful for them to confirm specs at a glance without asking you.
  pdfDoc.setTitle(`${originalName} - ${spec.label} (PrintReady)`);
  pdfDoc.setSubject(`${spec.dpi} DPI - ${spec.colorMode} - ${spec.widthMm}x${spec.heightMm}mm`);
  pdfDoc.setCreator("PrintReady AI");
  pdfDoc.setProducer("PrintReady AI Platform");
  pdfDoc.setCreationDate(new Date());

  const pdfBytes = await pdfDoc.save();

  logger.info("PDF generated", {
    sizeKb: Math.round(pdfBytes.length / 1024),
    pageSizePt: `${Math.round(pageWidthPt)}x${Math.round(pageHeightPt)}`,
  });

  return Buffer.from(pdfBytes);
}

// drawCropMarks 
// Draws 8 small lines - 2 per corner - marking where the trim line is.
// Each corner gets a horizontal mark and a vertical mark, positioned just outside the trim line (inside the bleed area boundary).
function drawCropMarks(page, pageWidthPt, pageHeightPt, bleedPt) {
  const markLength = 8 * MM_TO_PT / 3; // roughly 8mm long marks
  const gapFromTrim = 2;               // small gap so marks don't touch the artwork
  const color = rgb(0, 0, 0);
  const thickness = 0.5;

  // Trim line coordinates (where bleed ends and actual design begins)
  const trimLeft   = bleedPt;
  const trimRight  = pageWidthPt - bleedPt;
  const trimBottom = bleedPt;
  const trimTop    = pageHeightPt - bleedPt;

  const marks = [
    // Top-left corner: one horizontal line, one vertical line
    { x1: trimLeft, y1: trimTop + gapFromTrim, x2: trimLeft, y2: trimTop + gapFromTrim + markLength },
    { x1: trimLeft - gapFromTrim - markLength, y1: trimTop, x2: trimLeft - gapFromTrim, y2: trimTop },

    // Top-right corner
    { x1: trimRight, y1: trimTop + gapFromTrim, x2: trimRight, y2: trimTop + gapFromTrim + markLength },
    { x1: trimRight + gapFromTrim, y1: trimTop, x2: trimRight + gapFromTrim + markLength, y2: trimTop },

    // Bottom-left corner
    { x1: trimLeft, y1: trimBottom - gapFromTrim, x2: trimLeft, y2: trimBottom - gapFromTrim - markLength },
    { x1: trimLeft - gapFromTrim - markLength, y1: trimBottom, x2: trimLeft - gapFromTrim, y2: trimBottom },

    // Bottom-right corner
    { x1: trimRight, y1: trimBottom - gapFromTrim, x2: trimRight, y2: trimBottom - gapFromTrim - markLength },
    { x1: trimRight + gapFromTrim, y1: trimBottom, x2: trimRight + gapFromTrim + markLength, y2: trimBottom },
  ];

  marks.forEach(({ x1, y1, x2, y2 }) => {
    page.drawLine({
      start:     { x: x1, y: y1 },
      end:       { x: x2, y: y2 },
      thickness,
      color,
    });
  });
}

module.exports = { generatePdf };