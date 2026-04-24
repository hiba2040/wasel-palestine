/**
 * Routes Estimation Controller
 * Handles route estimation, analysis, and safe corridor requests
 */

const mockMapsService = require('../services/openRouteService');
const mockWeatherService = require('../services/openWeatherService');
const cacheManager = require('../services/cacheManager');
const { Checkpoint } = require('../models');

/**
 * Calculate safety score based on checkpoints on route
 */
const calculateSafetyScore = async (checkpoints) => {
    if (!checkpoints || checkpoints.length === 0) return 100;

    const openCount = checkpoints.filter(c => c.status === 'open').length;
    const closedCount = checkpoints.filter(c => c.status === 'closed').length;
    const restrictedCount = checkpoints.filter(c => c.status === 'restricted').length;

    const total = checkpoints.length;
    const safetyScore = ((openCount / total) * 100) - (closedCount * 10) - (restrictedCount * 5);
    
    return Math.max(0, Math.min(100, safetyScore));
};

const toRad = (value) => (value * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const pointToSegmentDistanceKm = (point, start, end) => {
    const px = point.lon;
    const py = point.lat;
    const x1 = start.lon;
    const y1 = start.lat;
    const x2 = end.lon;
    const y2 = end.lat;

    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
        return haversineKm(py, px, y1, x1);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return haversineKm(py, px, projY, projX);
};

/**
 * Find checkpoints near route
 */
const findCheckpointsNearRoute = async (sourceLat, sourceLon, destLat, destLon, geometryCoordinates = [], radiusKm = 5) => {
    try {
        const allCheckpoints = await Checkpoint.findAll();

        const routePath = Array.isArray(geometryCoordinates) && geometryCoordinates.length > 1
            ? geometryCoordinates.map((coord) => ({ lon: Number(coord[0]), lat: Number(coord[1]) }))
            : [
                { lat: sourceLat, lon: sourceLon },
                { lat: destLat, lon: destLon }
            ];
        
        const nearbyCheckpoints = allCheckpoints.filter(checkpoint => {
            const point = {
                lat: Number(checkpoint.latitude),
                lon: Number(checkpoint.longitude)
            };

            let minDistance = Number.POSITIVE_INFINITY;
            for (let i = 0; i < routePath.length - 1; i += 1) {
                const segmentDistance = pointToSegmentDistanceKm(point, routePath[i], routePath[i + 1]);
                if (segmentDistance < minDistance) {
                    minDistance = segmentDistance;
                }
            }

            return minDistance <= radiusKm;
        });

        return nearbyCheckpoints;
    } catch (error) {
        console.error('Error finding checkpoints near route:', error);
        return [];
    }
};

/**
 * GET /api/v1/routes/estimate
 * Estimate route between two coordinates
 */
const estimateRoute = async (req, res) => {
    try {
        const { sourceLat, sourceLon, destLat, destLon } = req.query;

        // Validate inputs
        if (!sourceLat || !sourceLon || !destLat || !destLon) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: sourceLat, sourceLon, destLat, destLon'
            });
        }

        const source = { lat: parseFloat(sourceLat), lon: parseFloat(sourceLon) };
        const dest = { lat: parseFloat(destLat), lon: parseFloat(destLon) };

        if ([source.lat, source.lon, dest.lat, dest.lon].some(Number.isNaN)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinate values'
            });
        }

        // Check cache first
        const cacheKey = `route:${source.lat}:${source.lon}:${dest.lat}:${dest.lon}`;
        let cachedRoute = await cacheManager.get(cacheKey);
        
        if (cachedRoute) {
            return res.status(200).json({
                success: true,
                data: cachedRoute,
                cached: true,
                message: 'Route estimate from cache'
            });
        }

        // Get route estimate from OpenRouteService
        const routeData = await mockMapsService.estimateRoute(
            source.lat, source.lon, dest.lat, dest.lon
        );

        if (!routeData.success) {
            return res.status(503).json({
                success: false,
                message: 'external service unavailable',
                service: 'openrouteservice',
                details: routeData.details || routeData.error
            });
        }

        const weatherCacheKey = `weather:${source.lat}:${source.lon}`;
        const weatherPayload = await cacheManager.getOrSet(
            weatherCacheKey,
            async () => {
                const weatherData = await mockWeatherService.getWeatherByCoordinates(source.lat, source.lon);
                if (!weatherData.success) {
                    return {
                        success: false,
                        error: weatherData.error,
                        details: weatherData.details
                    };
                }

                const hazardous = mockWeatherService.isHazardousWeather(weatherData.data);
                return {
                    success: true,
                    payload: {
                        condition: weatherData.data.weather?.[0]?.main || 'Unknown',
                        temperature: weatherData.data.main?.temp ?? null,
                        humidity: weatherData.data.main?.humidity ?? null,
                        windSpeed: weatherData.data.wind?.speed ?? 0,
                        hazardous
                    }
                };
            },
            parseInt(process.env.WEATHER_CACHE_TTL || '900', 10)
        );

        if (!weatherPayload?.success) {
            return res.status(503).json({
                success: false,
                message: 'external service unavailable',
                service: 'openweathermap',
                details: weatherPayload?.details || weatherPayload?.error || 'Weather service failed'
            });
        }

        const weatherSnapshot = weatherPayload.payload;

        // Find checkpoints near real route geometry
        const nearbyCheckpoints = await findCheckpointsNearRoute(
            source.lat,
            source.lon,
            dest.lat,
            dest.lon,
            routeData.data.geometryCoordinates || []
        );
        const safetyScore = await calculateSafetyScore(nearbyCheckpoints);
        const closedCheckpoints = nearbyCheckpoints.filter(c => c.status === 'closed' || c.status === 'restricted').length;

        // Prepare response
        const response = {
            route: routeData.data,
            safety: {
                score: Math.round(safetyScore * 100) / 100,
                checkpointsNearby: nearbyCheckpoints.length,
                closedOrRestrictedCheckpoints: closedCheckpoints,
                checkpoints: nearbyCheckpoints.map(c => ({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    lat: c.latitude,
                    lon: c.longitude
                }))
            },
            weather: weatherSnapshot,
            recommendation: safetyScore > 70 ? 'Safe to travel' : 
                           safetyScore > 40 ? 'Use caution, some restricted checkpoints' :
                           'Not recommended, multiple closed checkpoints'
        };

        // Store in cache for 1 hour
        await cacheManager.set(cacheKey, response, 3600);

        res.status(200).json({
            success: true,
            data: response,
            cached: false
        });
    } catch (error) {
        console.error('Route estimation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to estimate route',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/routes/analyze
 * Deep route analysis with alternative routes and detailed safety report
 */
const analyzeRoute = async (req, res) => {
    try {
        const { sourceLat, sourceLon, destLat, destLon } = req.query;

        if (!sourceLat || !sourceLon || !destLat || !destLon) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        const source = { lat: parseFloat(sourceLat), lon: parseFloat(sourceLon) };
        const dest = { lat: parseFloat(destLat), lon: parseFloat(destLon) };

        if ([source.lat, source.lon, dest.lat, dest.lon].some(Number.isNaN)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinate values'
            });
        }

        // Get alternative routes
        const alternativeRoutes = await mockMapsService.getAlternativeRoutes(
            source.lat, source.lon, dest.lat, dest.lon
        );

        if (!alternativeRoutes.success) {
            return res.status(503).json({
                success: false,
                message: 'external service unavailable',
                service: 'openrouteservice',
                details: alternativeRoutes.details || alternativeRoutes.error
            });
        }

        // Analyze each route
        const analyzedRoutes = [];
        const routeGeometry = alternativeRoutes.geometryCoordinates || [];

        for (const route of alternativeRoutes.data) {
            const checkpoints = await findCheckpointsNearRoute(
                source.lat,
                source.lon,
                dest.lat,
                dest.lon,
                routeGeometry
            );
            const safetyScore = await calculateSafetyScore(checkpoints);

            analyzedRoutes.push({
                name: route.name,
                distance: route.distance,
                estimatedTime: route.estimatedTime,
                avgSpeed: route.avgSpeed,
                confidence: route.confidence,
                safetyScore: Math.round(safetyScore * 100) / 100,
                riskLevel: safetyScore > 70 ? 'Low' : safetyScore > 40 ? 'Medium' : 'High',
                checkpointsAffected: checkpoints.length
            });
        }

        // Get weather alerts
        const weatherAlerts = await mockWeatherService.getWeatherAlerts(
            source.lat, source.lon
        );

        res.status(200).json({
            success: true,
            data: {
                routes: analyzedRoutes,
                weatherAlerts: weatherAlerts.data?.alerts || [],
                recommendation: analyzedRoutes[0]?.safetyScore > 70 
                    ? `Take route: ${analyzedRoutes[0]?.name}` 
                    : 'All routes have safety concerns. Consider alternatives or postpone travel.'
            }
        });
    } catch (error) {
        console.error('Route analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze route',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/routes/safe-corridors
 * Get safe route corridors based on checkpoint status
 */
const getSafeCorridors = async (req, res) => {
    try {
        // Get all open checkpoints
        const openCheckpoints = await Checkpoint.findAll({
            where: { status: 'open' }
        });

        // Create corridor map
        const corridors = openCheckpoints.map(checkpoint => ({
            checkpoint: {
                id: checkpoint.id,
                name: checkpoint.name,
                region: checkpoint.region,
                lat: checkpoint.latitude,
                lon: checkpoint.longitude
            },
            status: checkpoint.status,
            connectedTo: [] // In real scenario, would find connected routes
        }));

        res.status(200).json({
            success: true,
            data: {
                openCheckpointsCount: openCheckpoints.length,
                corridors: corridors,
                recommendedRoutes: [],
                message: `Found ${corridors.length} safe corridors`
            }
        });
    } catch (error) {
        console.error('Safe corridors error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get safe corridors',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/routes/history
 * Get route estimation history
 */
const getRouteHistory = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: [],
            message: 'Route history is temporarily unavailable'
        });
    } catch (error) {
        console.error('Route history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch route history',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/routes/cache-status
 * Get cache statistics
 */
const getCacheStatus = async (req, res) => {
    try {
        const cacheStatus = await cacheManager.getStatus();

        res.status(200).json({
            success: true,
            data: {
                cacheStatus
            }
        });
    } catch (error) {
        console.error('Cache status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get cache status',
            details: error.message
        });
    }
};

module.exports = {
    estimateRoute,
    analyzeRoute,
    getSafeCorridors,
    getRouteHistory,
    getCacheStatus,
    calculateSafetyScore,
    findCheckpointsNearRoute
};
