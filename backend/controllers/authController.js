
// Handles user registration and login.
// Passwords are NEVER stored in plain text - bcrypt hashes them.
// Successful auth returns a JWT the frontend stores and sends with future requests to prove identity.

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { pool }         = require("../config/db");
const { asyncHandler } = require("../middleware/errorHandler");
const logger           = require("../utils/logger");

// bcrypt cost factor - higher is more secure but slower.
// 12 is the current industry-standard balance.
const BCRYPT_ROUNDS = 12;

// ── signToken 
// Creates a JWT containing the user's id, email, and role.
// Signed with JWT_SECRET so only this server can verify it - nobody can forge a token without knowing that secret.
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, shopId: user.shop_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ── POST /api/auth/register 
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "customer" } = req.body;

  // ── Input validation 
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  if (!["customer", "printer"].includes(role)) {
    return res.status(400).json({ message: "Role must be customer or printer" });
  }

  // ── Check for existing account 
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  // ── Hash the password 
  // This is the ONLY place the plain text password ever exists.
  // After this line, it's irreversibly transformed.
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // If registering as a printer, automatically assign them to the default shop. Customers don't need a shop_id at all -
  // they're not tied to any specific print shop.
  let shopId = null;

  if (role === "printer") {
    const { rows: shopRows } = await pool.query(
      "SELECT id FROM shops WHERE slug = 'default'"
    );
    shopId = shopRows[0]?.id || null;
  }

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password, role, shop_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, shop_id, created_at`,
    [name.trim(), email.toLowerCase().trim(), hashedPassword, role, shopId]
  );

  const user  = rows[0];
  const token = signToken(user);

  logger.info(`New user registered: ${user.email} (${user.role})`);

  res.status(201).json({
  token,
  user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shop_id },
  });
});

// ── POST /api/auth/login ─
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Fetch the user INCLUDING the hashed password
  // (we never select password in any other query in this app)
  const { rows } = await pool.query(
    "SELECT id, name, email, password, role FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );

  if (rows.length === 0) {
    // Same message whether email doesn't exist OR password is wrong.
    // Revealing "email not found" lets attackers enumerate valid emails on your platform - never do that.
    return res.status(401).json({ message: "Incorrect email or password" });
  }

  const user = rows[0];

  // bcrypt.compare hashes the submitted password the same way  and checks if it matches the stored hash - this is the only
  // way to verify a bcrypt hash, there's no "decrypt" function.
  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Incorrect email or password" });
  }

  const token = signToken(user);

  logger.info(`User logged in: ${user.email}`);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// ── GET /api/auth/me 
// Used by the frontend to verify a stored token is still valid
// (e.g. when the app first loads and checks if the user is logged in)
const getMe = asyncHandler(async (req, res) => {
  // req.user was already attached by the protect middleware
  // before this controller even runs
  res.json({ user: req.user });
});

module.exports = { register, login, getMe };