function setupAnomalyBroadcaster(io, pool, intervalMs = 15000) {
  let lastSeenScoreId = 0;

  async function seedLastSeen() {
    const result = await pool.query('SELECT COALESCE(MAX(score_id), 0) AS max_score_id FROM anomaly_scores');
    lastSeenScoreId = Number(result.rows[0].max_score_id || 0);
  }

  async function pollCriticalAnomalies() {
    const query = `
      SELECT
        a.score_id,
        a.reading_id,
        a.severity,
        a.detected_at,
        w.city_name,
        ST_Y(w.location::geometry) AS lat,
        ST_X(w.location::geometry) AS lon
      FROM anomaly_scores a
      JOIN weather_readings w ON w.id = a.reading_id
      WHERE a.score_id > $1
      ORDER BY a.score_id ASC
    `;

    const result = await pool.query(query, [lastSeenScoreId]);
    if (!result.rows.length) {
      return;
    }

    for (const row of result.rows) {
      lastSeenScoreId = Math.max(lastSeenScoreId, Number(row.score_id));
      if (row.severity !== 'critical') {
        continue;
      }

      io.emit('anomaly_alert', {
        score_id: row.score_id,
        reading_id: row.reading_id,
        severity: row.severity,
        city_name: row.city_name,
        lat: row.lat,
        lon: row.lon,
        detected_at: row.detected_at,
        message: `Critical anomaly detected near ${row.city_name || 'unknown location'}`
      });
    }
  }

  seedLastSeen()
    .then(() => {
      setInterval(async () => {
        try {
          await pollCriticalAnomalies();
        } catch (error) {
          console.error('Anomaly broadcaster poll failed:', error.message);
        }
      }, intervalMs);
    })
    .catch((error) => {
      console.error('Anomaly broadcaster init failed:', error.message);
    });
}

module.exports = {
  setupAnomalyBroadcaster
};
