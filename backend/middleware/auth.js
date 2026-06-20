
// JWT verification middleware. Two exports:
//   protect       -> blocks request if not logged in (printer dashboard)
//   optionalAuth   -> attaches user if logged in, otherwise continues
//                     as a guest (upload endpoint works for both)
//
// The JWT is expected in the request header like this:
//   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

const jwt    = require("jsonwebtoken");
const { pool } = require("../config/db");
const logger = require("../utils/logger");

// ── protect 
// Use this on routes that REQUIRE a logged-in user.
// If the token is missing, expired, or invalid — the request is stopped here and never reaches the controller.
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not logged in — no token provided" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer xxx" -> "xxx"

    // jwt.verify checks the signature AND expiry in one call.
    // Throws an error if either check fails — caught below.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded looks like: { id: "uuid", email: "...", role: "...", iat, exp }

    // Confirm the user still exists (handles deleted accounts gracefully)
    const { rows } = await pool.query(
      "SELECT id, name, email, role, shop_id FROM users WHERE id = $1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = rows[0]; // now available to every handler after this
    next();              // let the request continue to the controller

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired — please log in again" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ── optionalAuth 
// Use this on routes that work for BOTH guests and logged-in users.
// If a valid token exists, attach req.user. If not, just continue
// without blocking — req.user stays undefined, controller handles it.
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // No token at all — this is a guest, let them through as-is
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      "SELECT id, name, email, role, shop_id FROM users WHERE id = $1",
      [decoded.id]
    );

    if (rows.length > 0) {
      req.user = rows[0];
    }
    // If the token was somehow invalid for a deleted user,
    // we just don't attach req.user — still let the request through

  } catch (err) {
    // Token exists but is invalid/expired — log it but don't block.
    // Treat them as a guest rather than rejecting the whole request.
    logger.debug("optionalAuth: invalid token, continuing as guest", {
      message: err.message,
    });
  }

  next(); // always continue, whether or not auth succeeded
}

// ── restrictTo 
// Use AFTER protect — limits a route to specific roles only.
// Example: only printers can see the dashboard, not customers.
function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }
    next();
  };
}

module.exports = { protect, optionalAuth, restrictTo };