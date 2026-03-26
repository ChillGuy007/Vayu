const axios = require('axios');
const pool = require('./db');

async function fetchWeather() {
  console.log("Fetching grid-based weather data...");

  try {
    const latStart = 8;
    const latEnd = 37;
    const lonStart = 68;
    const lonEnd = 97;

    const step = 5; // adjust density (smaller = more points)

    for (let lat = latStart; lat <= latEnd; lat += step) {
      for (let lon = lonStart; lon <= lonEnd; lon += step) {

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,pressure_msl,precipitation`;

        const response = await axios.get(url);
        const data = response.data;

        const temperature = data.current_weather?.temperature;
        const wind_speed = data.current_weather?.windspeed;

        const lastIndex = data.hourly.time.length - 1;

        const humidity = data.hourly.relativehumidity_2m[lastIndex];
        const pressure = data.hourly.pressure_msl[lastIndex];
        const precipitation = data.hourly.precipitation[lastIndex];

        if (!temperature || !humidity || !pressure) continue;

        await pool.query(
          `INSERT INTO weather_readings 
          (location, city_name, temperature, humidity, pressure, wind_speed, precipitation)
          VALUES (
            ST_SetSRID(ST_MakePoint($1, $2), 4326),
            $3, $4, $5, $6, $7, $8
          )`,
          [
            lon,
            lat,
            `GRID_${lat}_${lon}`, // synthetic name
            temperature,
            humidity,
            pressure,
            wind_speed,
            precipitation
          ]
        );

        console.log(`Inserted: ${lat}, ${lon}`);
      }
    }

    console.log("✅ Grid fetch completed\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

module.exports = fetchWeather;