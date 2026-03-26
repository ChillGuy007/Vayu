const express = require('express');
const authenticate = require('../middleware/authenticate');
const { createSosController } = require('../controllers/sosController');

function createSosRoutes(io) {
  const router = express.Router();
  const postSos = createSosController(io);

  router.post('/sos', authenticate, postSos);

  return router;
}

module.exports = createSosRoutes;
