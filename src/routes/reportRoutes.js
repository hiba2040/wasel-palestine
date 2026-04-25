const express = require('express');
const router = express.Router();

const {
    getAllReports,
    createReport,
    moderateReport,
    voteReport,
    getReportModerationHistory
} = require('../controllers/reportController');

const { protect, isModerator } = require('../middleware/authMiddleware');

router.get('/', getAllReports);
router.post('/', protect, createReport);
router.post('/:id/vote', protect, voteReport);
router.put('/:id/moderate', protect, isModerator, moderateReport);
router.get('/:id/moderation-history', protect, isModerator, getReportModerationHistory);

module.exports = router;