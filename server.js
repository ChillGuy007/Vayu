#!/usr/bin/env node

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const pool = require('./db');
const authRoutes = require('./routes/authRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const contactRoutes = require('./routes/contactRoutes');
const createSosRoutes = require('./routes/sosRoutes');
const { ensureBackendTables } = require('./models/schemaModel');
const { setupAnomalyBroadcaster } = require('./services/anomalyBroadcaster');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', anomalyRoutes);
app.use('/api', weatherRoutes);
app.use('/api', contactRoutes);
app.use('/api', createSosRoutes(io));

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Realtime channel connected' });
});

async function start() {
  try {
    await ensureBackendTables();
    setupAnomalyBroadcaster(io, pool);

    const port = Number(process.env.PORT || 3000);
    server.listen(port, () => {
      console.log(`REST API running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error.message);
    process.exit(1);
  }
}

start();
