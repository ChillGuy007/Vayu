const pool = require('../db');
const { listContacts } = require('../models/contactModel');
const { sendSmsToContacts } = require('../services/alerts');

function createSosController(io) {
  return async function postSos(req, res) {
    try {
      const { lat, lon, message } = req.body;
      const userId = req.user.userId;

      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
        return res.status(400).json({ error: 'lat and lon are required numeric values' });
      }

      const saveQuery = `
        INSERT INTO sos_events (user_id, location, message)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
        RETURNING event_id, user_id, message, created_at,
                  ST_Y(location::geometry) AS lat,
                  ST_X(location::geometry) AS lon
      `;

      const saved = await pool.query(saveQuery, [
        userId,
        Number(lon),
        Number(lat),
        message || 'Emergency SOS triggered'
      ]);

      const event = saved.rows[0];
      const contacts = await listContacts(userId);

      io.emit('sos_alert', {
        event_id: event.event_id,
        user_id: event.user_id,
        lat: event.lat,
        lon: event.lon,
        message: event.message,
        created_at: event.created_at
      });

      const smsSummary = await sendSmsToContacts(contacts, {
        body: `SOS ALERT from user ${userId}: ${event.message} at (${event.lat}, ${event.lon})`
      });

      return res.status(201).json({
        status: 'broadcasted',
        event,
        contacts_count: contacts.length,
        sms: smsSummary
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

module.exports = {
  createSosController
};
