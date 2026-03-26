const pool = require('../db');

async function getWeatherByLatLon(req, res) {
  try {
    const lat = Number(req.params.lat);
    const lon = Number(req.params.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat and lon must be numeric' });
    }

    const query = `
      WITH nearest AS (
        SELECT
          ST_AsText(location::geometry) AS location_key,
          city_name,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) / 1000.0 AS distance_km
        FROM weather_readings
        ORDER BY ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) ASC
        LIMIT 1
      )
      SELECT
        w.id,
        w.city_name,
        w.temperature,
        w.humidity,
        w.pressure,
        w.wind_speed,
        w.precipitation,
        w.recorded_at,
        ST_Y(w.location::geometry) AS lat,
        ST_X(w.location::geometry) AS lon,
        n.distance_km
      FROM weather_readings w
      JOIN nearest n ON ST_AsText(w.location::geometry) = n.location_key
      WHERE w.recorded_at >= NOW() - INTERVAL '7 days'
      ORDER BY w.recorded_at ASC
    `;

    const result = await pool.query(query, [lon, lat]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'No weather history found for nearby location' });
    }

    return res.json({
      location: {
        city_name: result.rows[0].city_name,
        lat: result.rows[0].lat,
        lon: result.rows[0].lon,
        distance_km: Number(result.rows[0].distance_km)
      },
      history: result.rows
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getWeatherByLatLon
};
