
// Main entry point for the Express backend.

require("dotenv").config(); // aloads .env into process.env

const express      = require("express");
const cors         = require("cors");//cross origin resource sharing
const helmet       = require("helmet");
const morgan       = require("morgan");
const path         = require("path");

const { createTables } = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");
const logger           = require("./utils/logger");


const jobRoutes  = require("./routes/jobs");
const authRoutes = require("./routes/auth");
const printerRoutes = require("./routes/printer")

const app  = express();
const PORT = process.env.PORT || 5000;

// ─ Security middleware ─
// helmet adds HTTP headers that block common attacks
// e.g. prevents your site being loaded in an iframe (clickjacking)
app.use(helmet({
  // We need this so browsers can load images from Azure URLs
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── CORS ──

// Without this, React app on localhost:5173 cannot call
// your backend on localhost:5000 — browser blocks it
// CLIENT_URL in .env controls which frontend is allowed
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // allow cookies if we need them later
}));

// ── Request logging ─
// Morgan logs every HTTP request coming in
// "dev" format: GET /api/jobs/history 200 45ms
// so it goes to log files too
app.use(morgan("dev", {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// ─ Body parsers ─
// These let Express read request bodies
// express.json()       → reads JSON bodies { "email": "..." }
// express.urlencoded() → reads HTML form submissions
// limit:"2mb" prevents people sending huge JSON payloads
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Static files ─
// Serves files from the uploads/ folder directly e.g. GET /uploads/abc123-printready.pdf
// This is only used locally in development
// In production, files go to Azure Blob Storage instead
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ── Routes ─
// Each route file handles a group of related endpoints
// auth routes  → /api/auth/register, /api/auth/login
// job routes   → /api/jobs/upload, /api/jobs/history etc.

app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/printer",printerRoutes)

// ── Health check ──
// Render and Docker ping this URL to check if server is alive
// If this returns 200, the server is healthy
// If it doesn't respond, Render will restart the container
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

// ── 404 handler ─
// (instead of Express's default HTML error page)
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ── Global error handler ─
// Must be LAST and must have exactly 4 parameters
// Express identifies it as an error handler by the 4th param (next)
// Any route that does next(err) lands here
app.use(errorHandler);

// ── Start ──
async function start() {
  try {
    // Create DB tables before accepting any requests
    await createTables();

    app.listen(PORT, () => {
      logger.info(`PrintReady backend running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

  } catch (err) {
    // If DB connection fails, log it and exit
    logger.error("Failed to start server", { message: err.message ,stack: err.stack});
    console.error("full error",err)
    process.exit(1);
  }
}

start();