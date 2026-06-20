
// Maps URLs to controller functions. Deliberately thin — no business logic here, just wiring middleware and controllers
// together in the right order for each route.

const router = require("express").Router();

const {
  getVendors,
  getVendorProducts,
  uploadAndProcess,
  getHistory,
  getJob,
} = require("../controllers/jobController");

const { upload, multerErrorHandler } = require("../middleware/upload");
const { optionalAuth, protect } = require("../middleware/auth");
// ── GET /api/jobs/vendors 
// Called when the frontend loads the upload page — populates the first dropdown (vendor selection)
router.get("/vendors", getVendors);

// ── GET /api/jobs/vendors/:vendorId/products 
// Called after the user picks a vendor — populates the second dropdown (product selection)
router.get("/vendors/:vendorId/products", getVendorProducts);

// ── POST /api/jobs/upload 
// The main pipeline. Middleware runs in this exact order:
//   1. upload.single("image")  -> Multer extracts the file into req.file
//   2. multerErrorHandler      -> catches any Multer-specific errors
//   3. uploadAndProcess        -> the actual pipeline (only runs if file is valid)
router.post(
  "/upload",
  optionalAuth,
  upload.single("image"),
  multerErrorHandler,
  uploadAndProcess
);

// ── GET /api/jobs/history 
// Returns the 50 most recent jobs
router.get("/history",protect,getHistory);

// ── GET /api/jobs/:id 
// Returns one specific job's full details + fresh download URLs
// IMPORTANT: this must come AFTER /history and /vendors routes above,
// otherwise Express would try to match "history" as if it were an :id
router.get("/:id", getJob);

module.exports = router;