/**
 * Routes Estimation Controller
 * Handles route estimation, analysis, and safe corridor requests
 */

const mockMapsService = require('../services/mockMapsService');
const mockWeatherService = require('../services/mockWeatherService');
const cacheManager = require('../services/cacheManager');
const { Checkpoint, RouteEstimate, RouteCache } = require('../models');

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

/**
 * Find checkpoints near route
 */
const findCheckpointsNearRoute = async (sourceLat, sourceLon, destLat, destLon, radiusKm = 5) => {
    try {
        const allCheckpoints = await Checkpoint.findAll();
        
        const nearbyCheckpoints = allCheckpoints.filter(checkpoint => {
            const lat1 = sourceLat, lon1 = sourceLon;
            const lat2 = destLat, lon2 = destLon;
            const lat3 = checkpoint.latitude, lon3 = checkpoint.longitude;

            // Simple distance calculation
            const distToSource = Math.sqrt(Math.pow(lat3 - lat1, 2) + Math.pow(lon3 - lon1, 2)) * 111; // ~111km per degree
            const distToDest = Math.sqrt(Math.pow(lat3 - lat2, 2) + Math.pow(lon3 - lon2, 2)) * 111;
            
            // Point is near route if it's within radius of either endpoint or roughly on path
            const minDistToRoute = Math.min(distToSource, distToDest);
            return minDistToRoute <= radiusKm;
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

        // Get route estimate from maps service
        const routeData = await mockMapsService.estimateRoute(
            source.lat, source.lon, dest.lat, dest.lon
        );

        if (!routeData.success) {
            return res.status(500).json(routeData);
        }

        // Get weather data
        const weatherData = await mockWeatherService.getWeatherByCoordinates(
            source.lat, source.lon
        );
        const isWeatherHazardous = weatherData.success && 
            mockWeatherService.isHazardousWeather(weatherData.data);

        // Find checkpoints near route
        const nearbyCheckpoints = await findCheckpointsNearRoute(
            source.lat, source.lon, dest.lat, dest.lon
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
            weather: weatherData.success ? {
                condition: weatherData.data.weather?.[0]?.main || 'Unknown',
                temperature: weatherData.data.main?.temp || 'N/A',
                humidity: weatherData.data.main?.humidity || 'N/A',
                windSpeed: weatherData.data.wind?.speed || 0,
                hazardous: isWeatherHazardous
            } : null,
            recommendation: safetyScore > 70 ? 'Safe to travel' : 
                           safetyScore > 40 ? 'Use caution, some restricted checkpoints' :
                           'Not recommended, multiple closed checkpoints'
        };

        // Store in cache for 1 hour
        await cacheManager.set(cacheKey, response, 3600);

        // Store in database
        try {
            await RouteEstimate.create({
                source_lat: source.lat,
                source_lon: source.lon,
                destination_lat: dest.lat,
                destination_lon: dest.lon,
                distance_km: routeData.data.distance,
                estimated_time_minutes: routeData.data.estimatedTime,
                safety_score: safetyScore,
                hazardous_checkpoints: closedCheckpoints,
                weather_condition: weatherData.success ? weatherData.data.weather?.[0]?.main : 'unknown',
                weather_hazard: isWeatherHazardous,
                avg_speed_kmh: routeData.data.avgSpeed,
                route_polyline: routeData.data.polyline,
                is_cached: false
            });
        } catch (dbError) {
            console.warn('Warning: Could not save route estimate to DB:', dbError.message);
        }

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

        // Get alternative routes
        const alternativeRoutes = await mockMapsService.getAlternativeRoutes(
            source.lat, source.lon, dest.lat, dest.lon
        );

        if (!alternativeRoutes.success) {
            return res.status(500).json(alternativeRoutes);
        }

        // Analyze each route
        const analyzedRoutes = [];
        for (const route of alternativeRoutes.data) {
            const checkpoints = await findCheckpointsNearRoute(
                source.lat, source.lon, dest.lat, dest.lon
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
        const { region } = req.query;

        // Get all open checkpoints
        const openCheckpoints = await Checkpoint.findAll({
            where: { status: 'open' }
        });

        // Get high safety routes from cache
        const safeRoutes = await RouteEstimate.getHighSafetyRoutes(20);

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
                recommendedRoutes: safeRoutes.slice(0, 5).map(r => ({
                    distance: r.distance_km,
                    safetyScore: r.safety_score,
                    estimatedTime: r.estimated_time_minutes
                })),
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
        const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query;

        const history = await RouteEstimate.getAllRaw({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            order: 'DESC'
        });

        res.status(200).json({
            success: true,
            data: history
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
        const dbCacheStats = await RouteCache.getStatistics();

        res.status(200).json({
            success: true,
            data: {
                redisCache: cacheStatus,
                databaseCache: dbCacheStats
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
