
// Maps auth URLs to controller functions.
// register and login are public - no token needed to call them
// /me requires a token since it returns info about "the current user."

const router = require("express").Router();

const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// ── POST /api/auth/register 
// Public - anyone can create an account
router.post("/register", register);

// ── POST /api/auth/login 
// Public - anyone can attempt to log in
router.post("/login", login);

// ── GET /api/auth/me 
// Protected - requires a valid JWT
// Used by the frontend on app load to check "am I still logged in?"
router.get("/me", protect, getMe);

module.exports = router;