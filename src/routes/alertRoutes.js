const express = require('express');
const router = express.Router();

const {
    getMyAlerts,
    createAlert,
    getMySubscriptions,
    createSubscription,
    markAlertAsRead
} = require('../controllers/alertController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, getMyAlerts);
router.post('/', protect, isAdmin, createAlert);

router.get('/subscriptions', protect, getMySubscriptions);
router.post('/subscriptions', protect, createSubscription);

router.put('/:id/read', protect, markAlertAsRead);

module.exports = router;