const express = require('express');
const { getWeatherByLatLon } = require('../controllers/weatherController');

const router = express.Router();

router.get('/weather/:lat/:lon', getWeatherByLatLon);

module.exports = router;
