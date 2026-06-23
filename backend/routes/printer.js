
// Printer-only endpoints. Every route here requires:
//   1. A valid JWT (protect)
//   2. role === "printer" (restrictTo)
//
// A logged-in customer hitting these URLs gets a 403, even if
// they know the exact endpoint - the backend enforces this independently of whatever the frontend shows or hides.

const router = require("express").Router();
const rateLimit= require("express-rate-limit");

const { getAllJobsForPrinter, updateJobStatus } = require("../controllers/jobController");
const { protect, restrictTo } = require("../middleware/auth");


const printerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
// ── GET /api/printer/jobs 
// Returns all jobs in the system, optionally filtered by ?status= Example: GET /api/printer/jobs?status=queued
router.get(
  "/jobs",
  printerLimiter,
  protect,
  restrictTo("printer"),
  getAllJobsForPrinter
);

// ── PATCH /api/printer/jobs/:id/status 
// Marks a job as completed or rejected
router.patch(
  "/jobs/:id/status",
  printerLimiter,
  protect,
  restrictTo("printer"),
  updateJobStatus
);

module.exports = router;