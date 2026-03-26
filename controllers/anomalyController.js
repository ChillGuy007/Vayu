const pool = require('../db');

async function getAnomalies(req, res) {
  try {
    const severity = req.query.severity;
    const from = req.query.from;
    const to = req.query.to;
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || req.query.limit || 50), 1), 200);
    const offset = (page - 1) * pageSize;

    const params = [];
    const filters = [];

    if (severity) {
      params.push(severity);
      filters.push(`a.severity = $${params.length}`);
    }

    if (from) {
      params.push(from);
      filters.push(`a.detected_at >= $${params.length}::timestamptz`);
    }

    if (to) {
      params.push(to);
      filters.push(`a.detected_at <= $${params.length}::timestamptz`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM anomaly_scores a
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(pageSize);
    const limitPlaceholder = `$${params.length}`;

    params.push(offset);
    const offsetPlaceholder = `$${params.length}`;

    const query = `
      SELECT
        a.score_id,
        a.reading_id,
        a.anomaly_score_zscore,
        a.is_anomaly_zscore,
        a.anomaly_score_isolationforest,
        a.is_anomaly_isolationforest,
        a.severity,
        a.detected_at,
        a.acknowledged,
        w.city_name,
        w.temperature,
        w.humidity,
        w.pressure,
        w.wind_speed,
        w.precipitation,
        w.recorded_at,
        ST_Y(w.location::geometry) AS lat,
        ST_X(w.location::geometry) AS lon
      FROM anomaly_scores a
      JOIN weather_readings w ON w.id = a.reading_id
      ${whereClause}
      ORDER BY a.detected_at DESC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `;

    const result = await pool.query(query, params);
    return res.json({
      page,
      pageSize,
      total,
      count: result.rows.length,
      items: result.rows
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAnomalies
};
