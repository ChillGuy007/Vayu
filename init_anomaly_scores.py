#!/usr/bin/env python3
"""
Create only the anomaly_scores table for the Vaayu anomaly detection system.
Does not modify weather_readings.
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')


def init_anomaly_scores_table():
    """Create anomaly_scores table and related indexes if missing."""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=os.getenv('DB_PORT', 5432)
    )
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS anomaly_scores (
                score_id SERIAL PRIMARY KEY,
                reading_id INTEGER UNIQUE NOT NULL REFERENCES weather_readings(id) ON DELETE CASCADE,
                anomaly_score_zscore DOUBLE PRECISION,
                is_anomaly_zscore BOOLEAN DEFAULT FALSE,
                anomaly_score_isolationforest DOUBLE PRECISION,
                is_anomaly_isolationforest BOOLEAN DEFAULT FALSE,
                severity VARCHAR(20) DEFAULT 'normal',
                detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                acknowledged BOOLEAN DEFAULT FALSE
            );
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_anomaly_reading_id
            ON anomaly_scores(reading_id);
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_anomaly_severity
            ON anomaly_scores(severity, detected_at DESC);
            """
        )

        conn.commit()
        print('✓ anomaly_scores table initialized successfully')
    except Exception as error:
        conn.rollback()
        print(f'✗ Failed to initialize anomaly_scores table: {error}')
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    init_anomaly_scores_table()
