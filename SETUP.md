# Vaayu - Anomaly Detection Engine

A weather anomaly detection system using Z-score baseline analysis and Isolation Forest machine learning models.

## Project Structure

- `anomaly_engine.py` - Main anomaly detection engine with Z-score and Isolation Forest algorithms
- `init_db.py` - Database schema initialization script
- `scheduler.py` - Python scheduler for hourly execution (cron-friendly)
- `scheduler.js` - Node.js scheduler wrapper (for child_process execution)
- `requirements.txt` - Python dependencies
- `.env` - Environment configuration (configure DB credentials and API keys)

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Edit `.env` with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=weather_db
DB_USER=postgres
DB_PASSWORD=your_password
OPENWEATHERMAP_API_KEY=your_api_key
```

### 3. Initialize Database
```bash
python3 init_db.py
```

This creates:
- `weather_readings` table - stores raw weather data
- `anomaly_scores` table - stores detection results
- Indices for performance optimization

## Running the Engine

### One-time Run
```bash
python3 anomaly_engine.py
```

### Automated Hourly Execution (Linux/Mac)
Add to crontab:
```bash
0 * * * * cd /path/to/project && python3 scheduler.py
```

### Automated Hourly Execution (Node.js)
```bash
node scheduler.js
```

## Running REST API Backend

```bash
npm run start:api
```

Default port is `3000` (set `PORT` in `.env` to override).

### Required auth env var

```env
JWT_SECRET=change_this_to_a_long_random_secret
```

### Optional SMS env vars (for SOS)

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

### API Test Commands

See `API_TESTS.md` for quick curl checks of all endpoints.

Or with node-cron (uncomment in scheduler.js and install):
```bash
npm install node-cron
node scheduler.js
```

## Algorithm Overview

### Week 1: Z-Score Baseline
- Calculates rolling mean and standard deviation per location
- Flags readings where |z-score| > 2.5
- Simple but effective for initial anomaly detection

### Week 2-3: Isolation Forest
- Trains one model per location on historical data
- Detects anomalies based on isolation score < -0.5
- Better at detecting multivariate anomalies
- Considers temperature, pressure, and humidity together

### Week 4: Results Storage
- Writes anomaly scores back to database
- Classifies severity: normal, warning, critical
- Results can trigger alerts via Node.js backend

## Database Schema

### weather_readings
- `reading_id` (PK) - unique identifier
- `location_id` - weather station location
- `temp`, `pressure`, `humidity` - measurements
- `created_at` - timestamp

### anomaly_scores
- `score_id` (PK)
- `reading_id` (FK) - references weather_readings
- `anomaly_score_zscore` - Z-score value
- `is_anomaly_zscore` - boolean flag
- `anomaly_score_isolationforest` - IF decision boundary
- `is_anomaly_isolationforest` - boolean flag
- `severity` - normal/warning/critical
- `acknowledged` - for alert tracking

## Logs

Logs are stored in `logs/` directory:
- `anomaly_engine.log` - Python execution logs
- Timestamped daily logs from Node.js scheduler

## Integration with Node.js Backend

The Node.js backend can trigger hourly anomaly detection:

```javascript
const { exec } = require('child_process');

// Run Python anomaly engine every hour
setInterval(() => {
    exec('python3 /path/to/anomaly_engine.py', (error, stdout, stderr) => {
        if (error) console.error('Anomaly detection failed:', error);
        else console.log('Anomaly detection completed');
    });
}, 60 * 60 * 1000); // 1 hour
```

Or use the provided Node.js scheduler:
```javascript
const { execFile } = require('child_process');
execFile('node', ['scheduler.js']);
```

## Tuning Parameters

Edit `anomaly_engine.py` to adjust:
- Z-score threshold (default: 2.5)
- Isolation Forest contamination (default: 0.1)
- Decision boundary score (default: -0.5)
- Severity thresholds
- Days of historical data to analyze (default: 30)

## Monitoring

Check logs for:
- Number of anomalies detected per run
- Database write success
- Connection errors
- Performance metrics

## Future Enhancements

- Real-time streaming detection
- Seasonality adjustment
- Location clustering
- Deep learning models (LSTM)
- Alert integration with SMS/Email
