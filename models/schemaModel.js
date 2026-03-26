const pool = require('../db');

async function ensureBackendTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(120),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      contact_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, phone)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sos_events (
      event_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      location GEOGRAPHY(Point, 4326),
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contacts_user_id
    ON emergency_contacts(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sos_events_created_at
    ON sos_events(created_at DESC);
  `);
}

module.exports = {
  ensureBackendTables
};
