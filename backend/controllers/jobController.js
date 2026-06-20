
// The main pipeline orchestrator. Calls every service in order:
// analyse -> score -> process -> generate PDF -> upload to Azure -> save to DB
//
// If any step fails, the job is marked "failed" in the database
// with the error message, so nothing is silently lost.

const { pool }            = require("../config/db");
const { uploadToAzure, getDownloadUrl } = require("../config/azure");
const { analyseImage, processImage, scoreImage } = require("../services/imageService");
const { generatePdf }     = require("../services/pdfService");
const { getSpec, getVendorList, getProductsForVendor } = require("../services/vendorTemplates");
const { asyncHandler }    = require("../middleware/errorHandler");
const logger              = require("../utils/logger");

// ── GET /api/jobs/vendors 
// Returns the vendor list for the frontend's first dropdown.
const getVendors = asyncHandler(async (req, res) => {
  res.json({ vendors: getVendorList() });
});

// ── GET /api/jobs/vendors/:vendorId/products
// Returns products for one vendor — populates the second dropdown
// after the user picks a vendor in step 1.
const getVendorProducts = asyncHandler(async (req, res) => {
  const products = getProductsForVendor(req.params.vendorId);
  if (!products) {
    return res.status(404).json({ message: "Vendor not found" });
  }
  res.json({ products });
});

// ── POST /api/jobs/upload 
// The main pipeline. Multer has already run by the time this executes,
// so req.file.buffer contains the raw uploaded bytes.
const uploadAndProcess = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const { vendorId, productId } = req.body;
  if (!vendorId || !productId) {
    return res.status(400).json({ message: "vendorId and productId are required" });
  }

  // Look up the exact spec this image needs to be processed to
  const spec = getSpec(vendorId, productId);
  if (!spec) {
    return res.status(404).json({
      message: `No spec found for vendor "${vendorId}" product "${productId}"`,
    });
  }

  // ── Create job record FIRST, before any processing 
  // This way, even if something crashes below, we have a row recording that this upload was attempted.
  // For now, every job goes to the default shop. When you onboard a second print shop later, this is where you'd determine WHICH
  // shop based on a subdomain, a dropdown selection, or a unique link.
  const { rows: defaultShopRows } = await pool.query(
    "SELECT id FROM shops WHERE slug = 'default'"
  );
  const shopId = defaultShopRows[0]?.id || null;

  const { rows } = await pool.query(
    `INSERT INTO jobs (
      user_id, shop_id, original_name, file_size_kb, mime_type,
      vendor_id, product_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
    RETURNING id`,
    [
      req.user?.id || null,
      shopId,
      req.file.originalname,
      Math.round(req.file.size / 1024),
      req.file.mimetype,
      vendorId,
      productId,
    ]
  );
  const jobId = rows[0].id;

  logger.info(`Job ${jobId} created — starting pipeline`);

  try {
    const originalBuffer = req.file.buffer;

    // ── Step 1: Analyse 
    const analysis = await analyseImage(originalBuffer, spec);

    // ── Step 2: Score 
    const scoring = scoreImage(analysis, spec);

    // ── Step 3: Upload original to Azure 
    const originalBlobName = await uploadToAzure(
      originalBuffer,
      `original-${req.file.originalname}`,
      req.file.mimetype
    );

    // ── Step 4: Process with Sharp 
    const processedBuffer = await processImage(originalBuffer, spec);

    // ── Step 5: Upload processed image to Azure 
    const processedMimeType = spec.format === "png" ? "image/png" : "image/jpeg";
    const processedBlobName = await uploadToAzure(
      processedBuffer,
      `processed-${req.file.originalname}`,
      processedMimeType
    );

    // ── Step 6: Generate print-ready PDF 
    const pdfBuffer = await generatePdf(processedBuffer, spec, req.file.originalname);
    const pdfBlobName = await uploadToAzure(
      pdfBuffer,
      `${req.file.originalname.replace(/\.[^.]+$/, "")}-printready.pdf`,
      "application/pdf"
    );

    // ── Step 7: Build the meta object shown in the UI 
    const meta = {
      originalSize:  `${Math.round(originalBuffer.length / 1024)} KB`,
      processedSize: `${Math.round(processedBuffer.length / 1024)} KB`,
      pdfSize:       `${Math.round(pdfBuffer.length / 1024)} KB`,
      targetSize:    `${spec.pxWidth}x${spec.pxHeight}px`,
      dpi:           `${spec.dpi} DPI`,
      format:        spec.format.toUpperCase(),
      colorMode:     spec.colorMode,
      vendor:        vendorId,
      product:       productId,
    };

    // ── Step 8: Update job record as completed 
    await pool.query(
      `UPDATE jobs SET
         status = 'completed',
         width = $1, height = $2, format = $3,
         score = $4, quality_label = $5,
         issues = $6, suggestions = $7, checks = $8,
         original_url = $9, processed_url = $10, pdf_url = $11,
         updated_at = NOW()
       WHERE id = $12`,
      [
        analysis.width, analysis.height, analysis.format,
        scoring.score, scoring.qualityLabel,
        JSON.stringify(scoring.issues),
        JSON.stringify(scoring.suggestions),
        JSON.stringify(scoring.checks),
        originalBlobName, processedBlobName, pdfBlobName,
        jobId,
      ]
    );

    // ── Step 9: Generate fresh SAS download URLs 
    // These expire after 60 minutes — safe to send to the frontend
    const [originalUrl, processedUrl, pdfUrl] = await Promise.all([
      getDownloadUrl(originalBlobName),
      getDownloadUrl(processedBlobName),
      getDownloadUrl(pdfBlobName),
    ]);

    logger.info(`Job ${jobId} completed — score ${scoring.score}`);

    // ── Step 10: Return everything to the frontend 
    res.status(201).json({
      jobId,
      status:       "completed",
      score:        scoring.score,
      qualityLabel: scoring.qualityLabel,
      checks:       scoring.checks,
      issues:       scoring.issues,
      suggestions:  scoring.suggestions,
      aiInsights:   scoring.aiInsights,
      meta,
      outputs: {
        original:  originalUrl,
        processed: processedUrl,
        pdf:       pdfUrl,
      },
    });

  } catch (err) {
    // ── Pipeline failed — mark the job as failed, don't lose the record 
    await pool.query(
      `UPDATE jobs SET status = 'rejected', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [err.message, jobId]
    );

    logger.error(`Job ${jobId} failed`, { message: err.message });

    // Re-throw so the global errorHandler in server.js sends a clean response
    throw err;
  }
});

// ── GET /api/jobs/history 
// Returns past jobs, newest first. 
// for now this returns everyone's jobs since there's no login yet.
const getHistory = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, original_name, file_size_kb, width, height,
            score, quality_label, vendor_id, product_id,
            status, created_at
     FROM jobs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );
  res.json({ jobs: rows });
});

// ── GET /api/jobs/:id 
// Returns full details for one job, including fresh download URLs
// (SAS URLs expire, so we regenerate them every time this is called)
const getJob = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM jobs WHERE id = $1",
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "Job not found" });
  }

  const job = rows[0];

  const [originalUrl, processedUrl, pdfUrl] = await Promise.all([
    getDownloadUrl(job.original_url),
    getDownloadUrl(job.processed_url),
    getDownloadUrl(job.pdf_url),
  ]);


  res.json({
    ...job,
    outputs: { original: originalUrl, processed: processedUrl, pdf: pdfUrl },
  });
});
// ── GET /api/printer/jobs 
// Returns ALL jobs in the system, not filtered by user_id.
// Only reachable by printer/admin roles (enforced by restrictTo middleware).
// Supports optional status filtering via query param.
const getAllJobsForPrinter = asyncHandler(async (req, res) => {
  const { status } = req.query;

  // req.user.shop_id comes from the JWT, attached by the auth
  // middleware. This is the core of multi-tenancy: every printer  only ever sees jobs belonging to THEIR shop.
  const shopId = req.user.shop_id;

  let query = `
    SELECT j.*, u.name as customer_name, u.email as customer_email
    FROM jobs j
    LEFT JOIN users u ON u.id = j.user_id
    WHERE j.shop_id = $1
  `;
  const params = [shopId];

  if (status && status !== "all") {
    query += " AND j.status = $2";
    params.push(status);
  }

  query += " ORDER BY j.created_at DESC LIMIT 100";

  const { rows } = await pool.query(query, params);

  logger.info(`Printer dashboard fetched ${rows.length} jobs`, {
    shopId, filter: status || "all",
  });

  res.json({ jobs: rows });
});

// ── PATCH /api/printer/jobs/:id/status 
// Lets a printer mark a job as completed or rejected.
// If rejected, a reason is required - this gets shown to the customer later when they check their job/history.
const updateJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!["completed", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "Status must be 'completed' or 'rejected'",
    });
  }

  if (status === "rejected" && !rejectionReason) {
    return res.status(400).json({
      message: "A rejection reason is required when rejecting a job",
    });
  }

  const { rows } = await pool.query(
    `UPDATE jobs SET
       status = $1,
       rejection_reason = $2,
       updated_at = NOW()
     WHERE id = $3
     RETURNING id, status, rejection_reason`,
    [status, status === "rejected" ? rejectionReason : null, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "Job not found" });
  }

  logger.info(`Job ${id} marked as ${status} by printer ${req.user.email}`);

  res.json({ job: rows[0] });
});

module.exports = {
  getVendors,
  getVendorProducts,
  uploadAndProcess,
  getHistory,
  getJob,
  getAllJobsForPrinter,
  updateJobStatus,
};