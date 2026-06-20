// middleware/errorHandler.js
// Central error handler — every unhandled error in the app lands here.
// Without this, Express sends an ugly HTML error page.


const logger = require("../utils/logger");

// asyncHandler wraps async route functions
// so you don't need try/catch in every single controller.
//
// Instead of:
//   router.get("/", async (req, res) => {
//     try { ... } catch(err) { next(err) }
//   })
//
// You write:
//   router.get("/", asyncHandler(async (req, res) => { ... }))
//
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}


// Express knows it's an error handler because it has 4 params
function errorHandler(err, req, res, next) {
  // Log the full error internally (with stack trace)
  logger.error("Unhandled error", {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  const status = err.statusCode || err.status || 500;

  // In production, hide internal error details from users
  // In dev, show the full message so you can debug
  const message =
    status < 500
      ? err.message
      : process.env.NODE_ENV === "production"
      ? "Something went wrong on our end"
      : err.message;

  res.status(status).json({ message });
}

module.exports = { asyncHandler, errorHandler };