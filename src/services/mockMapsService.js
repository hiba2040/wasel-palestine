/**
 * Mock Maps Service
 * Simulates Google Maps API for route estimation
 * Uses Haversine formula for realistic distance calculations
 */

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Calculate estimated travel time based on distance and average speed
const calculateTravelTime = (distanceKm) => {
    // Average speeds: 60 km/h in cities, 80 km/h on highways, 100 km/h on open roads
    // Simple heuristic: assume 70 km/h average
    const averageSpeed = 70; // km/h
    const hours = distanceKm / averageSpeed;
    return Math.ceil(hours * 60); // Return in minutes
};

/**
 * Estimate route between two coordinates
 * @param {number} sourceLat - Source latitude
 * @param {number} sourceLon - Source longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @returns {Promise<Object>} Route estimation with distance and time
 */
const estimateRoute = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        // Calculate distance using Haversine formula
        const distance = calculateDistance(sourceLat, sourceLon, destLat, destLon);
        
        // Calculate estimated travel time
        const travelTime = calculateTravelTime(distance);
        
        // Add some realistic variation (10% variance)
        const variance = distance * 0.1;
        const realisticDistance = distance + (Math.random() - 0.5) * variance;
        
        return {
            success: true,
            data: {
                distance: Math.round(realisticDistance * 100) / 100, // 2 decimal places
                distanceUnit: 'km',
                estimatedTime: travelTime,
                timeUnit: 'minutes',
                polyline: `mock_polyline_${Date.now()}`, // Mock polyline
                steps: Math.ceil(distance / 5), // Approximately one step per 5km
                avgSpeed: Math.round(distance / (travelTime / 60) * 100) / 100,
                confidence: 0.95
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to estimate route',
            details: error.message
        };
    }
};

/**
 * Get directions (more detailed route info)
 * @param {number} sourceLat
 * @param {number} sourceLon
 * @param {number} destLat
 * @param {number} destLon
 * @returns {Promise<Object>} Detailed directions
 */
const getDirections = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        const routeEstimate = await estimateRoute(sourceLat, sourceLon, destLat, destLon);
        
        if (!routeEstimate.success) {
            return routeEstimate;
        }

        // Add additional direction details
        return {
            success: true,
            data: {
                ...routeEstimate.data,
                bounds: {
                    northeast: { lat: Math.max(sourceLat, destLat) + 0.1, lng: Math.max(sourceLon, destLon) + 0.1 },
                    southwest: { lat: Math.min(sourceLat, destLat) - 0.1, lng: Math.min(sourceLon, destLon) - 0.1 }
                },
                copyrights: 'Mock Maps Service',
                status: 'OK'
            }
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to get directions',
            details: error.message
        };
    }
};

/**
 * Calculate multiple alternative routes
 * @param {number} sourceLat
 * @param {number} sourceLon
 * @param {number} destLat
 * @param {number} destLon
 * @returns {Promise<Object>} Multiple route alternatives
 */
const getAlternativeRoutes = async (sourceLat, sourceLon, destLat, destLon) => {
    try {
        const mainRoute = await estimateRoute(sourceLat, sourceLon, destLat, destLon);
        
        if (!mainRoute.success) {
            return mainRoute;
        }

        // Generate 2 alternative routes with different characteristics
        const routes = [
            {
                name: 'Fastest Route',
                distance: mainRoute.data.distance * 0.9, // 10% shorter
                estimatedTime: mainRoute.data.estimatedTime * 0.85, // 15% faster
                avgSpeed: mainRoute.data.avgSpeed * 1.05,
                confidence: 0.97
            },
            {
                name: 'Scenic Route',
                distance: mainRoute.data.distance * 1.2, // 20% longer
                estimatedTime: mainRoute.data.estimatedTime * 1.25, // 25% longer
                avgSpeed: mainRoute.data.avgSpeed * 0.95,
                confidence: 0.88
            },
            {
                name: 'Balanced Route',
                ...mainRoute.data
            }
        ];

        return {
            success: true,
            data: routes
        };
    } catch (error) {
        return {
            success: false,
            error: 'Failed to get alternative routes',
            details: error.message
        };
    }
};

module.exports = {
    estimateRoute,
    getDirections,
    getAlternativeRoutes,
    calculateDistance,
    calculateTravelTime
};
