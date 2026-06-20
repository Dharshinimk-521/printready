// utils/logger.js
// Winston logger — replaces console.log throughout the app.
// Two transports (places logs go):
//   1. Console → you see it in terminal while developing
//   2. File    → written to logs/ folder in production

const { createLogger, format, transports } = require("winston");

const isDev = process.env.NODE_ENV !== "production";

const logger = createLogger({
  // In dev: show everything including debug messages
  // In prod: only show info and above (skip debug noise)
  level: isDev ? "debug" : "info",

  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }), // include stack trace on errors
    format.json()                   // structured JSON logs
  ),

  transports: [
    // Always log to console
    new transports.Console({
      format: isDev
        // Dev: coloured, readable
        ? format.combine(format.colorize(), format.simple())
        // Prod: JSON (easier for log aggregators to parse)
        : format.json(),
    }),

    // In production also write errors to a file
    // so you can check them later even after terminal closes
    ...(isDev ? [] : [
      new transports.File({
        filename: "logs/error.log",
        level: "error",   // only errors go here
      }),
      new transports.File({
        filename: "logs/combined.log", // everything goes here
      }),
    ]),
  ],
});

module.exports = logger;