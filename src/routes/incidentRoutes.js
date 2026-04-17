const express = require('express');
const router = express.Router();
const { getAllIncidents } = require('../controllers/incidentController');

router.get('/', getAllIncidents);

module.exports = router;
