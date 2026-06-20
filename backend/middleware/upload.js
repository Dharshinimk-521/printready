
// Multer configuration - intercepts multipart/form-data uploads
// and gives controllers a clean req.file object.
//
// memoryStorage keeps the file as a Buffer in RAM (req.file.buffer)
// instead of writing it to disk. 

const multer = require("multer");

// Anything else gets rejected before it even reaches controller.
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// 50MB covers even high-resolution print files comfortably
const MAX_FILE_SIZE_MB = 50;

const storage = multer.memoryStorage();

// fileFilter runs BEFORE the file is fully received.
// If it calls cb(error), Multer rejects the upload immediately - no point receiving 50MB of data just to reject it after.
const fileFilter = (req, file, cb) => {
  if (ACCEPTED_TYPES.includes(file.mimetype)) {
    cb(null, true); // accept the file
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Only PNG, JPG, and WebP are accepted.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Multer wants bytes, not MB
    files: 1, // one file per request - batch uploads come later
  },
});

// multerErrorHandler 
// Multer throws its OWN error type (MulterError) for things like "file too large". We catch those specifically and turn them
// into clean JSON responses instead of a stack trace.
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
      });
    }
    return res.status(400).json({ message: err.message });
  }

  // Errors from our custom fileFilter (wrong file type) land here too
  if (err) {
    return res.status(400).json({ message: err.message });
  }

  next();
}

module.exports = { upload, multerErrorHandler };