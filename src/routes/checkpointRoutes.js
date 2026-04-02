const express = require('express');
const router = express.Router();
const controller = require('../controllers/checkpointController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/v1/checkpoints
 * @desc    Get all checkpoints with filtering, sorting, pagination
 * @access  Public
 * @query   status, region, page, limit, sortBy, order
 */
router.get('/', controller.getAllCheckpoints);

/**
 * @route   GET /api/v1/checkpoints/:id
 * @desc    Get single checkpoint by ID
 * @access  Public
 */
router.get('/:id', controller.getCheckpointById);

/**
 * @route   POST /api/v1/checkpoints
 * @desc    Create a new checkpoint
 * @access  Admin only
 * @body    { name, latitude, longitude, status?, description?, region }
 */
router.post('/', verifyToken, requireRole('admin'), controller.createCheckpoint);

/**
 * @route   PUT /api/v1/checkpoints/:id
 * @desc    Update checkpoint info (NOT status)
 * @access  Admin only
 */
router.put('/:id', verifyToken, requireRole('admin'), controller.updateCheckpoint);

/**
 * @route   DELETE /api/v1/checkpoints/:id
 * @desc    Delete a checkpoint
 * @access  Admin only
 */
router.delete('/:id', verifyToken, requireRole('admin'), controller.deleteCheckpoint);

/**
 * @route   GET /api/v1/checkpoints/:id/status
 * @desc    Get current status of a checkpoint
 * @access  Public
 */
router.get('/:id/status', controller.getCheckpointStatus);

/**
 * @route   POST /api/v1/checkpoints/:id/status
 * @desc    Update checkpoint status + auto-log to history
 * @access  Admin / Moderator
 * @body    { status: 'open'|'closed'|'restricted'|'unknown', note? }
 */
router.post('/:id/status', verifyToken, requireRole('admin', 'moderator'), controller.updateCheckpointStatus);

/**
 * @route   GET /api/v1/checkpoints/:id/history
 * @desc    Get full status history for a checkpoint
 * @access  Public
 * @query   page, limit
 */
router.get('/:id/history', controller.getStatusHistory);

module.exports = router;