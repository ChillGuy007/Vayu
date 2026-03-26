const express = require('express');
const { getAnomalies } = require('../controllers/anomalyController');

const router = express.Router();

router.get('/anomalies', getAnomalies);

module.exports = router;
