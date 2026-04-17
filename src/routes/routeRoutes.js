const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

/**
 * @route   GET /api/v1/routes/estimate
 * @desc    Estimate route between two coordinates
 * @access  Public
 * @query   sourceLat, sourceLon, destLat, destLon
 */
router.get('/estimate', routeController.estimateRoute);

/**
 * @route   GET /api/v1/routes/analyze
 * @desc    Analyze route with alternatives and detailed safety report
 * @access  Public
 * @query   sourceLat, sourceLon, destLat, destLon
 */
router.get('/analyze', routeController.analyzeRoute);

/**
 * @route   GET /api/v1/routes/safe-corridors
 * @desc    Get safe route corridors
 * @access  Public
 * @query   region (optional)
 */
router.get('/safe-corridors', routeController.getSafeCorridors);

/**
 * @route   GET /api/v1/routes/history
 * @desc    Get route estimation history
 * @access  Public
 * @query   page, limit, sortBy
 */
router.get('/history', routeController.getRouteHistory);

/**
 * @route   GET /api/v1/routes/cache-status
 * @desc    Get cache statistics and status
 * @access  Public
 */
router.get('/cache-status', routeController.getCacheStatus);

module.exports = router;
