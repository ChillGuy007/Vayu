const pool = require('../db');

async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT user_id, email, password_hash, full_name, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

async function createUser({ email, passwordHash, fullName }) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3)
     RETURNING user_id, email, full_name, created_at`,
    [email.toLowerCase(), passwordHash, fullName || null]
  );

  return result.rows[0];
}

module.exports = {
  findUserByEmail,
  createUser
};
