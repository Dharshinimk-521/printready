
// PostgreSQL connection pool + automatic table creation.
// Call createTables() once on server start 

const { Pool } = require("pg");
const logger   = require("../utils/logger");

// Pool reads DATABASE_URL from your .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Neon (cloud Postgres) requires SSL. Local Postgres doesn't.
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,

  max: 10,                     // max 10 open connections
  idleTimeoutMillis: 30000,    // close idle connections after 30s
  connectionTimeoutMillis: 2000, // fail fast if can't connect
});

// Log when a new connection opens.
pool.on("connect", () => {
  logger.info("PostgreSQL connection opened");
});

// Log pool-level errors.
pool.on("error", (err) => {
  logger.error("PostgreSQL pool error", { message: err.message });
});


// Runs on server startup. Creates all tables if they don't exist.
async function createTables() {
  const client = await pool.connect();

  try {
    await client.query(`

  -- shops table
  -- one row per print shop using the platform
  -- for now we just seed ONE default shop
  CREATE TABLE IF NOT EXISTS shops (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- users table
  CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'printer', 'admin')),
    shop_id     UUID REFERENCES shops(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- jobs table
  CREATE TABLE IF NOT EXISTS jobs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    shop_id           UUID REFERENCES shops(id) ON DELETE SET NULL,
    original_name     TEXT NOT NULL,
    file_size_kb      INTEGER,
    mime_type         TEXT,
    width             INTEGER,
    height            INTEGER,
    format            TEXT,
    vendor_id         TEXT,
    product_id        TEXT,
    status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','processing','completed','rejected')),
    score             INTEGER,
    quality_label     TEXT,
    issues            JSONB DEFAULT '[]',
    suggestions       JSONB DEFAULT '[]',
    checks            JSONB DEFAULT '[]',
    original_url      TEXT,
    processed_url     TEXT,
    pdf_url           TEXT,
    rejection_reason  TEXT,
    error_message     TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_user_id    ON jobs(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_shop_id    ON jobs(shop_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs(status);

`);

// ── Seed default shop 
// ── Seed default shop 
// For now there's only ever one shop. This INSERT only runs
// once - ON CONFLICT means it silently does nothing if it already exists, so it's safe to call on every server start.
await client.query(`
  INSERT INTO shops (name, slug)
  VALUES ('Default Print Shop', 'default')
  ON CONFLICT (slug) DO NOTHING;
`);
// Every printer account that doesn't already have a shop_id  gets linked to the default shop automatically.
// This handles printer accounts you already created (like
// printer@example.com) before this shop_id column existed.
  const { rows: defaultShop } = await client.query(
    "SELECT id FROM shops WHERE slug = 'default'"
  );

  await client.query(
    `UPDATE users SET shop_id = $1
    WHERE role = 'printer' AND shop_id IS NULL`,
    [defaultShop[0].id]
  );
  
  

    logger.info("Database tables ready");

  } finally {
    // Always release the connection back to the pool
    // even if the query threw an error
    client.release();
  }
}

module.exports = { pool, createTables };