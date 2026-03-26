const pool = require('../db');

async function listContacts(userId) {
  const result = await pool.query(
    `SELECT contact_id, user_id, name, phone, created_at
     FROM emergency_contacts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

async function addContact(userId, name, phone) {
  const result = await pool.query(
    `INSERT INTO emergency_contacts (user_id, name, phone)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, phone)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING contact_id, user_id, name, phone, created_at`,
    [userId, name, phone]
  );

  return result.rows[0];
}

module.exports = {
  listContacts,
  addContact
};
