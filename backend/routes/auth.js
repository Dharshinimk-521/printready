
// Maps auth URLs to controller functions.
// register and login are public - no token needed to call them
// /me requires a token since it returns info about "the current user."

const router = require("express").Router();

const { body, validationResult } = require("express-validator");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Checks validationResult after express-validator's checks run.
// If anything failed validation, respond with a clean error list.
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg, // show the first validation error
    });
  }
  next();
}

// ── POST /api/auth/register 
// Public - anyone can create an account
router.post(
  "/register",
  [
    // .trim() strips whitespace, .escape() neutralizes HTML/script
    // injection attempts, .normalizeEmail() standardizes email format
    body("name")
      .trim()
      .escape()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("email")
      .trim()
      .isEmail()
      .withMessage("A valid email is required")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters"),
    body("role")
      .optional()
      .isIn(["customer", "printer"])
      .withMessage("Role must be customer or printer"),
  ],
  handleValidation,
  register
);

// ── POST /api/auth/login 
// Public - anyone can attempt to log in
router.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  handleValidation,
  login
);

// ── GET /api/auth/me 
// Protected - requires a valid JWT
// Used by the frontend on app load to check "am I still logged in?"
router.get("/me", protect, getMe);

module.exports = router;