#!/usr/bin/env python3
"""
Database schema initialization for Vaayu anomaly detection system
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    """Create database tables for weather readings and anomaly scores"""
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=os.getenv('DB_PORT', 5432)
    )
    cursor = conn.cursor()
    
    try:
        # Ensure PostGIS is available for GEOGRAPHY(Point, 4326)
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

        # Drop existing tables if they exist
        cursor.execute("DROP TABLE IF EXISTS anomaly_scores CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS weather_readings CASCADE;")
        
        # Create weather_readings table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS weather_readings (
            id SERIAL PRIMARY KEY,
            location GEOGRAPHY(Point, 4326),
            city_name VARCHAR(100),
            temperature FLOAT,
            humidity FLOAT,
            pressure FLOAT,
            wind_speed FLOAT,
            precipitation FLOAT,
            recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Create anomaly_scores table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS anomaly_scores (
            score_id SERIAL PRIMARY KEY,
            reading_id INTEGER UNIQUE NOT NULL REFERENCES weather_readings(id) ON DELETE CASCADE,
            anomaly_score_zscore FLOAT,
            is_anomaly_zscore BOOLEAN DEFAULT FALSE,
            anomaly_score_isolationforest FLOAT,
            is_anomaly_isolationforest BOOLEAN DEFAULT FALSE,
            severity VARCHAR(20) DEFAULT 'normal',
            detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            acknowledged BOOLEAN DEFAULT FALSE
        );
        """)
        
        # Create indices for performance
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_weather_recorded_at
        ON weather_readings(recorded_at DESC);
        """)

        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_weather_city_time
        ON weather_readings(city_name, recorded_at DESC);
        """)

        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_weather_location_gist
        ON weather_readings USING GIST(location);
        """)
        
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_anomaly_severity 
        ON anomaly_scores(severity, detected_at DESC);
        """)
        
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_anomaly_reading_id 
        ON anomaly_scores(reading_id);
        """)
        
        conn.commit()
        print("✓ Database schema initialized successfully")
    
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        conn.rollback()
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    init_database()
