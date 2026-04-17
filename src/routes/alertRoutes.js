const express = require('express');
const router = express.Router();
const { getAllAlerts } = require('../controllers/alertController');

router.get('/', getAllAlerts);

module.exports = router;
