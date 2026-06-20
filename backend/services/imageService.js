
// Three exported functions:
//   analyseImage  -> reads metadata + calculates effective DPI + sharpness
//   scoreImage    -> runs all rule-based checks, returns full score panel
//   processImage  -> Sharp resize + format conversion to vendor spec
//
// All three work with Buffers - no files saved to disk at any point.

const sharp  = require("sharp");
const logger = require("../utils/logger");

// analyseImage 
// Reads image metadata and computes derived values:
//   effectiveDpi   -> real DPI based on pixel size vs physical print size
//   sharpnessScore -> edge-variance based blur detection

async function analyseImage(buffer, spec) {
  const meta = await sharp(buffer).metadata();

  //  Effective DPI 
  // Formula: pixels / physical inches = dots per inch
  // We calculate it for both width and height, then take the
  // SMALLER of the two - that's the bottleneck dimension.
  
  const widthInches  = spec.widthMm  / 25.4;
  const heightInches = spec.heightMm / 25.4;

  const dpiFromWidth  = meta.width  / widthInches;
  const dpiFromHeight = meta.height / heightInches;
  const effectiveDpi  = Math.round(Math.min(dpiFromWidth, dpiFromHeight));

  // Sharpness / blur detection 
  // We don't have ML here, but Sharp gives us a real technique:
  // run an edge-detection convolution kernel (similar to a
  // Laplacian filter), then measure the variance of the result.

  const sharpnessScore = await calculateSharpness(buffer);

  logger.debug("Image analysis complete", {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    effectiveDpi,
    sharpnessScore,
  });

  return {
    width:        meta.width,
    height:       meta.height,
    format:       meta.format,      // "png" | "jpeg" | "webp"
    channels:     meta.channels,    // 3 = RGB, 4 = RGBA or CMYK
    hasAlpha:     meta.hasAlpha,    // true = has transparency layer
    effectiveDpi,
    sharpnessScore,
    fileSizeKb:   Math.round(buffer.length / 1024),
  };
}

// calculateSharpness 
// Uses Sharp's raw pixel access to apply a Laplacian-style edge check.
// We read the resulting pixel buffer and calculate variance.
// High variance = lots of contrast change = sharp edges = in focus.
// Low variance = flat, smooth transitions = blurry.
async function calculateSharpness(buffer) {
  try {
    // Resize down first - running this on a full-size 6000px image
    // is slow and unnecessary.
    const small = await sharp(buffer)
      .resize(512, 512, { fit: "inside" })
      .greyscale() // edge detection works on luminance, not color
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = small;
    const { width, height } = info;

    // Simple Laplacian-like edge kernel applied manually:
    // for each pixel, compare it to its right and bottom neighbour.
    // Large differences = edges. We sum the squared differences
    // across the whole image, then average it (= variance).
    let sumSquaredDiff = 0;
    let count = 0;

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx       = y * width + x;
        const idxRight  = idx + 1;
        const idxBottom = idx + width;

        const current = data[idx];
        const right   = data[idxRight];
        const bottom  = data[idxBottom];

        const diff = (current - right) ** 2 + (current - bottom) ** 2;
        sumSquaredDiff += diff;
        count++;
      }
    }

    const variance = sumSquaredDiff / count;

    // Normalise to a 0-100 scale for easier scoring.
    // variance above ~800 is consistently sharp, below ~150 is consistently blurry.
    const normalised = Math.min(100, Math.round((variance / 800) * 100));

    return normalised;

  } catch (err) {
    // If sharpness detection fails for any reason, just return a neutral score and log it.
    logger.warn("Sharpness detection failed, using neutral fallback", {
      message: err.message,
    });
    return 50;
  }
}

// scoreImage
// Returns a full score object the frontend renders directly.
function scoreImage(analysis, spec) {
  let score = 100;
  const checks      = []; // the check ok/warn/fail panel
  const issues      = []; // plain text problems
  const suggestions = []; // plain text fixes

  // Check 1: Dimensions 
  const widthOk  = analysis.width  >= spec.pxWidth  * 0.9;
  const heightOk = analysis.height >= spec.pxHeight * 0.9;

  if (widthOk && heightOk) {
    checks.push({
      label:  "Correct dimensions",
      status: "pass",
      detail: `${analysis.width}x${analysis.height}px meets the ${spec.pxWidth}x${spec.pxHeight}px requirement`,
    });
  } else {
    score -= 20;
    checks.push({
      label:  "Dimensions too small",
      status: "fail",
      detail: `Got ${analysis.width}x${analysis.height}px - need at least ${spec.pxWidth}x${spec.pxHeight}px`,
    });
    issues.push(
      `Image dimensions are too small for ${spec.label}. ` +
      `Sharp will upscale but printed quality may suffer.`
    );
    suggestions.push(
      `Export from your design tool at exactly ${spec.pxWidth}x${spec.pxHeight}px`
    );
  }

  // Check 2: Effective DPI 
  // Now using the real formula: pixels / physical print size.
  // This replaces the old file-size guess entirely.
  const dpiOk = analysis.effectiveDpi >= spec.dpi * 0.85;

  if (dpiOk) {
    checks.push({
      label:  "High resolution",
      status: "pass",
      detail: `${analysis.effectiveDpi} effective DPI meets the ${spec.dpi} DPI requirement`,
    });
  } else {
    const deduction = analysis.effectiveDpi < spec.dpi * 0.5 ? 25 : 15;
    score -= deduction;
    checks.push({
      label:  "Low resolution",
      status: "fail",
      detail: `${analysis.effectiveDpi} effective DPI - ${spec.dpi} DPI required for ${spec.label}`,
    });
    issues.push(
      `Effective resolution is too low. At ${spec.widthMm}x${spec.heightMm}mm print size, ` +
      `this image only achieves ${analysis.effectiveDpi} DPI (need ${spec.dpi} DPI).`
    );
    suggestions.push(
      `Use an image at least ${Math.ceil(spec.widthMm / 25.4 * spec.dpi)}x` +
      `${Math.ceil(spec.heightMm / 25.4 * spec.dpi)}px for this print size`
    );
  }

  // Check 3: Aspect ratio match -
  // If the uploaded image's proportions don't match the template,
  // either heavy cropping (cover mode) or empty padding (inside mode)
  // will happen. Worth flagging either way.
  const templateRatio = spec.pxWidth / spec.pxHeight;
  const imageRatio    = analysis.width / analysis.height;
  const ratioDiff      = Math.abs(templateRatio - imageRatio) / templateRatio;

  if (ratioDiff < 0.05) {
    checks.push({
      label:  "Aspect ratio match",
      status: "pass",
      detail: `Image proportions closely match the ${spec.label} template`,
    });
  } else if (ratioDiff < 0.2) {
    score -= 5;
    checks.push({
      label:  "Aspect ratio slightly off",
      status: "warn",
      detail: spec.fitMode === "cover"
        ? "Some cropping will occur to fill the print area"
        : "Some empty padding will appear around the image",
    });
    suggestions.push(
      spec.fitMode === "cover"
        ? "Crop your image closer to the template's aspect ratio to avoid losing edges"
        : "Adjust your canvas to match the template's aspect ratio to avoid empty borders"
    );
  } else {
    score -= 12;
    checks.push({
      label:  "Aspect ratio mismatch",
      status: "fail",
      detail: `Image ratio (${imageRatio.toFixed(2)}) is far from the required ` +
              `${templateRatio.toFixed(2)} ratio for ${spec.label}`,
    });
    issues.push(
      "Image proportions are very different from the template. Significant " +
      "cropping or padding will occur."
    );
    suggestions.push(
      `Re-crop your design closer to a ${spec.pxWidth}:${spec.pxHeight} ratio before uploading`
    );
  }

  //  Check 4: Sharpness / blur detection 
  // sharpnessScore is 0-100 from calculateSharpness().
  if (analysis.sharpnessScore >= 40) {
    checks.push({
      label:  "Image sharpness",
      status: "pass",
      detail: `Sharpness score ${analysis.sharpnessScore}/100 - image is in focus`,
    });
  } else if (analysis.sharpnessScore >= 20) {
    score -= 10;
    checks.push({
      label:  "Slightly soft image",
      status: "warn",
      detail: `Sharpness score ${analysis.sharpnessScore}/100 - some softness detected`,
    });
    suggestions.push("Use a higher resolution source file for a crisper print result");
  } else {
    score -= 22;
    checks.push({
      label:  "Blurry image detected",
      status: "fail",
      detail: `Sharpness score ${analysis.sharpnessScore}/100 - image appears out of focus or heavily upscaled`,
    });
    issues.push(
      "Image appears blurry. This will look worse when printed at full size."
    );
    suggestions.push(
      "Use the original, unedited design file rather than a resized or re-saved copy"
    );
  }

  // Check 5: Background / Transparency 
  if (analysis.hasAlpha) {
    checks.push({
      label:  "Transparent background detected",
      status: "warn",
      detail: "PNG has an alpha channel. Verify the transparent areas are intentional for this product.",
    });
    suggestions.push(
      "If this product needs a solid background, flatten the image before uploading"
    );
  } else {
    checks.push({
      label:  "Background",
      status: "pass",
      detail: "No unexpected transparency detected",
    });
  }

  // Check 6: Safe margins / Text proximity 
  const likelyComplex = analysis.fileSizeKb > 500;
  checks.push({
    label:  "Safe margin / text proximity",
    status: likelyComplex ? "pass" : "warn",
    detail: likelyComplex
      ? "File appears detailed. Still verify no text is within 3-5mm of the trim edge."
      : "Small file detected - ensure no text or logos are within 5mm of the cut edges.",
  });
  if (!likelyComplex) {
    suggestions.push(
      "Keep all text and key design elements at least 5mm from the trim edge"
    );
  }

  // Check 7: Bleed area 
  if (spec.bleed) {
    const bleedMm      = spec.bleedMm || 3;
    const bleedPx       = Math.round((bleedMm / 25.4) * spec.dpi);
    const neededWidth   = spec.pxWidth  + bleedPx * 2;
    const neededHeight  = spec.pxHeight + bleedPx * 2;
    const hasBleed      = analysis.width >= neededWidth && analysis.height >= neededHeight;

    if (hasBleed) {
      checks.push({
        label:  "Bleed area present",
        status: "pass",
        detail: `Image includes ${bleedMm}mm bleed on all sides`,
      });
    } else {
      score -= 10;
      checks.push({
        label:  "Missing bleed area",
        status: "warn",
        detail: `${spec.label} requires ${bleedMm}mm bleed. Extend artwork to ${neededWidth}x${neededHeight}px`,
      });
      issues.push(`Bleed area missing. ${spec.label} requires ${bleedMm}mm bleed on all sides.`);
      suggestions.push(
        `Extend the background colour ${bleedMm}mm beyond the artboard edges before exporting`
      );
    }
  }

  // Check 8: Colour mode
  const likelyCmyk = analysis.format === "jpeg" && analysis.channels === 4;

  if (spec.colorMode === "CMYK") {
    if (likelyCmyk) {
      checks.push({
        label:  "Colour mode: CMYK",
        status: "pass",
        detail: "File appears to be CMYK as required by this vendor",
      });
    } else {
      score -= 10;
      checks.push({
        label:  "Colour mode mismatch",
        status: "warn",
        detail: `${spec.label} requires CMYK. File appears RGB - colours may shift slightly in print.`,
      });
      suggestions.push("Convert to CMYK before uploading: Photoshop -> Edit -> Convert to Profile -> CMYK");
    }
  } else {
    checks.push({
      label:  "Colour mode: RGB",
      status: "pass",
      detail: "RGB file for RGB output - correct for this product",
    });
  }

  // Check 9: File format / Compression 
  const formatStatus = analysis.format === "jpeg" && analysis.fileSizeKb < 200 ? "warn" : "pass";
  const formatDetail =
    analysis.format === "png"
      ? "Lossless PNG - ideal for print quality"
      : analysis.format === "jpeg"
      ? analysis.fileSizeKb < 200
        ? "Heavily compressed JPEG - may show artifacts at print size"
        : "JPEG - compression level appears acceptable"
      : "WebP - will be converted to print format by Sharp";

  checks.push({ label: "File format", status: formatStatus, detail: formatDetail });
  if (formatStatus === "warn") {
    suggestions.push("Use PNG instead of heavily compressed JPEG for better print quality");
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  const qualityLabel =
    score >= 90 ? "Excellent - ready to print"
    : score >= 75 ? "Good - minor issues detected"
    : score >= 55 ? "Fair - review issues before printing"
    :               "Poor - significant problems detected";

  logger.info("Scoring complete", { score, qualityLabel });

  return {
    score,
    qualityLabel,
    checks,
    issues,
    suggestions,
    aiInsights: {
      effectiveDpi:      analysis.effectiveDpi,
      sharpnessScore:    analysis.sharpnessScore,
      dpiSufficient:     dpiOk,
      upscaleNeeded:     !dpiOk || !widthOk || !heightOk,
      bgRemovalPossible: analysis.hasAlpha,
      aspectRatioDiff:   Math.round(ratioDiff * 100),
    },
  };
}

// processImage 
// The actual Sharp processing pipeline.
// Takes the original upload buffer, outputs a new buffer
// resized and converted to match the vendor spec exactly.
async function processImage(buffer, spec) {
  logger.info("Processing image with Sharp", {
    targetWidth:  spec.pxWidth,
    targetHeight: spec.pxHeight,
    targetDpi:    spec.dpi,
    targetFormat: spec.format,
    fitMode:      spec.fitMode,
  });
  // ── Warn about cropping in cover mode ────────────────────────
  // "cover" mode WILL crop the source if its aspect ratio doesn't
  // match the target exactly. 
  if (spec.fitMode === "cover") {
    const sourceMeta = await sharp(buffer).metadata();
    const sourceRatio = sourceMeta.width / sourceMeta.height;
    const targetRatio = spec.pxWidth / spec.pxHeight;
    const ratioDiff = Math.abs(sourceRatio - targetRatio) / targetRatio;

    if (ratioDiff > 0.1) {
      logger.warn("Cover mode will crop a meaningful portion of this image", {
        product: spec.label,
        sourceRatio: sourceRatio.toFixed(2),
        targetRatio: targetRatio.toFixed(2),
        estimatedCropPercent: Math.round(ratioDiff * 100),
      });
    }
  }
  // "cover" -> fills the box completely, crops overflow (T-shirts, mugs)
  // "inside" -> fits within the box, may leave padding (posters, die-cuts)
  const pipeline = sharp(buffer)
    .resize(spec.pxWidth, spec.pxHeight, {
      fit:spec.fitMode || "inside",
      withoutEnlargement: false,
      // When using "cover", this controls which part of the image
      // gets kept if cropping is needed. "centre" is the safest default.
      position: "centre",
    })
    .withMetadata({ density: spec.dpi });

  if (spec.format === "png") {
    pipeline.png({
      compressionLevel:  8,
      adaptiveFiltering: true,
    });
  } else {
    // JPEG output for PDF-wrapped products.
    // chromaSubsampling: "4:4:4" keeps full colour detail at every pixel -
    // critical for crisp text and logo edges. Default "4:2:0" would blur them.
    pipeline.jpeg({
      quality:           95,
      mozjpeg:           true,
      chromaSubsampling: "4:4:4",
    });
  }

  const processedBuffer = await pipeline.toBuffer();

  // Final validation check 
  // Confirm the actual output matches what we promised before
  // handing it off to PDF generation / Azure upload.
  // This catches rare Sharp edge cases (corrupted output, wrong dimensions due to a bad fit calculation, etc.) 
  const outputMeta = await sharp(processedBuffer).metadata();

if (spec.fitMode === "cover") {
  // "cover" PROMISES to fill the exact target box completely - any deviation here genuinely IS a bug worth catching.
  const widthMatches  = Math.abs(outputMeta.width  - spec.pxWidth)  <= 2;
  const heightMatches = Math.abs(outputMeta.height - spec.pxHeight) <= 2;

  if (!widthMatches || !heightMatches) {
    logger.error("Final validation failed - cover mode output dimensions don't match spec", {
      expected: `${spec.pxWidth}x${spec.pxHeight}`,
      actual:   `${outputMeta.width}x${outputMeta.height}`,
    });
    throw new Error(
      `Processing validation failed: expected ${spec.pxWidth}x${spec.pxHeight}, ` +
      `got ${outputMeta.width}x${outputMeta.height}`
    );
  }

} else {
  // "inside" mode only GUARANTEES the output fits WITHIN the box -
  // one dimension may legitimately be smaller if the source image's
  // aspect ratio doesn't match the target exactly. We only check
  // that neither dimension EXCEEDS the target (that would be a real bug).
  const widthWithinBounds  = outputMeta.width  <= spec.pxWidth  + 2;
  const heightWithinBounds = outputMeta.height <= spec.pxHeight + 2;

  if (!widthWithinBounds || !heightWithinBounds) {
    logger.error("Final validation failed - inside mode output exceeds target box", {
      target: `${spec.pxWidth}x${spec.pxHeight}`,
      actual: `${outputMeta.width}x${outputMeta.height}`,
    });
    throw new Error(
      `Processing validation failed: output ${outputMeta.width}x${outputMeta.height} ` +
      `exceeds target box ${spec.pxWidth}x${spec.pxHeight}`
    );
  }
}

  logger.info("Sharp processing complete and validated", {
    outputSizeKb: Math.round(processedBuffer.length / 1024),
    outputDimensions: `${outputMeta.width}x${outputMeta.height}`,
  });

  return processedBuffer;
}

module.exports = { analyseImage, processImage, scoreImage };