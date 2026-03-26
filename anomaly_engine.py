#!/usr/bin/env python3
"""
Anomaly Detection Engine
Detects anomalies in weather readings using Z-score and Isolation Forest algorithms
"""

import os
import psycopg2
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

class AnomalyDetectionEngine:
    def __init__(self):
        """Initialize database connection and parameters"""
        self.conn = None
        self.cursor = None
        self.scaler = StandardScaler()
        self.isolation_forest_models = {}  # One model per location
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('DB_HOST'),
                database=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                port=os.getenv('DB_PORT', 5432)
            )
            self.cursor = self.conn.cursor()
            self.ensure_anomaly_scores_table()
            print("✓ Database connection established")
        except Exception as e:
            print(f"✗ Database connection failed: {e}")
            raise

    def ensure_anomaly_scores_table(self):
        """Create anomaly_scores table if it does not exist for updated schema."""
        create_query = """
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

        index_query = """
        CREATE INDEX IF NOT EXISTS idx_anomaly_scores_reading_id
        ON anomaly_scores(reading_id);
        """

        self.cursor.execute(create_query)
        self.cursor.execute(index_query)
        self.conn.commit()
    
    def close_db(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
    
    def load_weather_data(self, days_back=30):
        """Load weather data from database for the last N days"""
        query = """
        SELECT
            id AS reading_id,
            city_name,
            ST_AsText(location::geometry) AS location_key,
            temperature AS temp,
            pressure,
            humidity,
            recorded_at AS created_at
        FROM weather_readings
        WHERE recorded_at >= NOW() - (%s * INTERVAL '1 day')
        ORDER BY location_key, created_at
        """
        try:
            df = pd.read_sql_query(
                query,
                self.conn,
                params=[days_back],
                parse_dates=['created_at']
            )
            print(f"✓ Loaded {len(df)} weather readings")
            return df
        except Exception as e:
            print(f"✗ Failed to load weather data: {e}")
            return None
    
    def calculate_zscore_anomalies(self, df):
        """
        Week 1: Detect anomalies using Z-score baseline
        Flags readings where |z| > 2.5
        """
        group_col = 'location_key'
        temp_std = df.groupby(group_col)['temp'].transform('std').replace(0, np.nan)
        pressure_std = df.groupby(group_col)['pressure'].transform('std').replace(0, np.nan)
        humidity_std = df.groupby(group_col)['humidity'].transform('std').replace(0, np.nan)

        df['z_score_temp'] = np.abs((df['temp'] - df.groupby(group_col)['temp'].transform('mean')) / temp_std)
        df['z_score_pressure'] = np.abs((df['pressure'] - df.groupby(group_col)['pressure'].transform('mean')) / pressure_std)
        df['z_score_humidity'] = np.abs((df['humidity'] - df.groupby(group_col)['humidity'].transform('mean')) / humidity_std)

        df[['z_score_temp', 'z_score_pressure', 'z_score_humidity']] = df[
            ['z_score_temp', 'z_score_pressure', 'z_score_humidity']
        ].fillna(0.0)
        
        # Flag if any metric exceeds Z-score threshold
        threshold = 2.5
        df['is_anomaly_zscore'] = (
            (df['z_score_temp'] > threshold) |
            (df['z_score_pressure'] > threshold) |
            (df['z_score_humidity'] > threshold)
        )
        df['anomaly_score_zscore'] = df[['z_score_temp', 'z_score_pressure', 'z_score_humidity']].max(axis=1)
        
        print(f"✓ Z-score analysis complete. Anomalies found: {df['is_anomaly_zscore'].sum()}")
        return df
    
    def train_isolation_forest(self, df):
        """
        Week 2-3: Train Isolation Forest models per location
        Returns dict of trained models
        """
        features = ['temp', 'pressure', 'humidity']
        models = {}
        
        for location_key in df['location_key'].unique():
            location_data = df[df['location_key'] == location_key][features]
            
            if len(location_data) > 10:  # Need minimum samples
                model = IsolationForest(contamination=0.1, random_state=42)
                model.fit(location_data)
                models[location_key] = model
        
        print(f"✓ Isolation Forest models trained for {len(models)} locations")
        return models
    
    def calculate_isolation_forest_anomalies(self, df, models):
        """
        Detect anomalies using Isolation Forest
        Returns anomaly scores between -1 (anomaly) and 1 (normal)
        """
        features = ['temp', 'pressure', 'humidity']
        df['anomaly_score_isolationforest'] = 0.0
        df['is_anomaly_isolationforest'] = False
        
        for location_key in df['location_key'].unique():
            mask = df['location_key'] == location_key
            
            if location_key in models:
                location_data = df.loc[mask, features]
                scores = models[location_key].decision_function(location_data)
                df.loc[mask, 'anomaly_score_isolationforest'] = scores
                # Isolation Forest returns negative scores for anomalies
                df.loc[mask, 'is_anomaly_isolationforest'] = scores < -0.5
        
        print(f"✓ Isolation Forest analysis complete. Anomalies found: {df['is_anomaly_isolationforest'].sum()}")
        return df
    
    def write_anomaly_scores(self, df):
        """
        Week 4: Write anomaly detection results back to database
        """
        try:
            insert_query = """
            INSERT INTO anomaly_scores (reading_id, anomaly_score_zscore, is_anomaly_zscore,
                                        anomaly_score_isolationforest, is_anomaly_isolationforest,
                                        severity, detected_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (reading_id) DO UPDATE SET
                anomaly_score_zscore = EXCLUDED.anomaly_score_zscore,
                is_anomaly_zscore = EXCLUDED.is_anomaly_zscore,
                anomaly_score_isolationforest = EXCLUDED.anomaly_score_isolationforest,
                is_anomaly_isolationforest = EXCLUDED.is_anomaly_isolationforest,
                severity = EXCLUDED.severity,
                detected_at = EXCLUDED.detected_at;
            """
            
            for _, row in df.iterrows():
                # Determine severity based on anomaly scores
                severity = 'normal'
                if row['is_anomaly_isolationforest'] or row['is_anomaly_zscore']:
                    if row.get('anomaly_score_isolationforest', 0) < -0.7 or row.get('anomaly_score_zscore', 0) > 3.0:
                        severity = 'critical'
                    else:
                        severity = 'warning'
                
                self.cursor.execute(insert_query, (
                    row['reading_id'],
                    float(row.get('anomaly_score_zscore', 0)),
                    bool(row.get('is_anomaly_zscore', False)),
                    float(row.get('anomaly_score_isolationforest', 0)),
                    bool(row.get('is_anomaly_isolationforest', False)),
                    severity,
                    datetime.now()
                ))
            
            self.conn.commit()
            print(f"✓ Written {len(df)} anomaly scores to database")
        except Exception as e:
            print(f"✗ Failed to write anomaly scores: {e}")
            self.conn.rollback()
    
    def run(self):
        """Execute the anomaly detection pipeline"""
        try:
            self.connect_db()
            
            # Load data
            df = self.load_weather_data(days_back=30)
            if df is None or len(df) == 0:
                print("No data to process")
                return
            
            # Week 1: Z-score analysis
            df = self.calculate_zscore_anomalies(df)
            
            # Week 2-3: Isolation Forest analysis
            models = self.train_isolation_forest(df)
            df = self.calculate_isolation_forest_anomalies(df, models)
            
            # Week 4: Write results
            self.write_anomaly_scores(df)
            
            print("✓ Anomaly detection pipeline completed successfully")
        
        except Exception as e:
            print(f"✗ Pipeline failed: {e}")
        
        finally:
            self.close_db()


if __name__ == "__main__":
    engine = AnomalyDetectionEngine()
    engine.run()
